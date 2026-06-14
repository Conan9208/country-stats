'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export type Difficulty = 'easy' | 'medium' | 'hard'

export type QuizQuestion = {
  countryCode: string
  countryName: string
  capital: string
  flagSvg: string
  options: string[]
  optionCodes: string[]  // options[i]에 해당하는 국가 alpha2 코드
}

export type QuizStats = {
  streak: number
  bestStreak: number
  totalCorrect: number
  totalAnswered: number
}

type CapitalEntry = {
  cca2: string
  capital: string[]
  region: string
  subregion: string
  flags: { svg: string; png: string }
}

// Module-level cache (shared across renders, fetched once per session)
let capitalsCache: CapitalEntry[] | null = null
let capitalsCachePromise: Promise<CapitalEntry[]> | null = null

export function getCapitalsData(): Promise<CapitalEntry[]> {
  if (capitalsCache) return Promise.resolve(capitalsCache)
  if (!capitalsCachePromise) {
    capitalsCachePromise = fetch('/api/countries')
      .then(r => r.json())
      .then((all: CapitalEntry[]) => {
        capitalsCache = all.filter(c => Array.isArray(c.capital) && c.capital.length > 0 && c.capital[0])
        return capitalsCache
      })
      .catch(() => {
        capitalsCachePromise = null
        return [] as CapitalEntry[]
      })
  }
  return capitalsCachePromise
}

function generateOptions(
  correct: string,
  target: CapitalEntry,
  all: CapitalEntry[],
  difficulty: Difficulty
): { capital: string; cca2: string }[] {
  let pool: CapitalEntry[]

  if (difficulty === 'hard') {
    pool = all.filter(c => c.subregion === target.subregion && c.cca2 !== target.cca2)
  } else if (difficulty === 'medium') {
    pool = all.filter(c => c.region === target.region && c.cca2 !== target.cca2)
  } else {
    pool = all.filter(c => c.region !== target.region && c.cca2 !== target.cca2)
  }

  if (pool.length < 3) {
    pool = all.filter(c => c.region === target.region && c.cca2 !== target.cca2)
  }
  if (pool.length < 3) {
    pool = all.filter(c => c.cca2 !== target.cca2)
  }

  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  const distractors: { capital: string; cca2: string }[] = []
  for (const c of shuffled) {
    const cap = c.capital[0]
    if (cap && cap !== correct && !distractors.some(d => d.capital === cap)) {
      distractors.push({ capital: cap, cca2: c.cca2 })
      if (distractors.length >= 3) break
    }
  }

  return [{ capital: correct, cca2: target.cca2 }, ...distractors].sort(() => Math.random() - 0.5)
}

export function useCountryQuiz({
  countryCode,
  countryName,
  difficulty,
}: {
  countryCode: string | null
  countryName: string | null
  difficulty: Difficulty
}) {
  const [question, setQuestion] = useState<QuizQuestion | null>(null)
  const [answered, setAnswered] = useState(false)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [stats, setStats] = useState<QuizStats>({
    streak: 0,
    bestStreak: 0,
    totalCorrect: 0,
    totalAnswered: 0,
  })

  const sessionIdRef = useRef<string | null>(null)

  // Load session id + remote stats on mount
  useEffect(() => {
    let id = typeof window !== 'undefined' ? localStorage.getItem('worldstats_quiz_session_id') : null
    if (!id) {
      id = crypto.randomUUID()
      if (typeof window !== 'undefined') localStorage.setItem('worldstats_quiz_session_id', id)
    }
    sessionIdRef.current = id

    fetch(`/api/quiz/sessions?session_id=${encodeURIComponent(id)}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: { streak: number; best_streak: number; total_correct: number; total_answered: number } | null) => {
        if (data) {
          setStats({
            streak: data.streak ?? 0,
            bestStreak: data.best_streak ?? 0,
            totalCorrect: data.total_correct ?? 0,
            totalAnswered: data.total_answered ?? 0,
          })
        }
      })
      .catch(() => {})
  }, [])

  // Generate question when countryCode changes
  useEffect(() => {
    let cancelled = false
    const resetQuestion = () => {
      setQuestion(null)
      setAnswered(false)
      setSelectedOption(null)
    }

    const timer = setTimeout(() => {
      resetQuestion()
      if (!countryCode || !countryName) {
        return
      }

      getCapitalsData().then(all => {
        if (cancelled) return
        const target = all.find(c => c.cca2.toUpperCase() === countryCode.toUpperCase())
        if (!target || !target.capital?.[0]) return

        const correct = target.capital[0]
        const optionEntries = generateOptions(correct, target, all, difficulty)

        setQuestion({
          countryCode,
          countryName,
          capital: correct,
          flagSvg: target.flags?.svg ?? target.flags?.png ?? '',
          options: optionEntries.map(o => o.capital),
          optionCodes: optionEntries.map(o => o.cca2),
        })
      })
    }, 0)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [countryCode, countryName, difficulty])

  const handleAnswer = useCallback(
    (selected: string) => {
      if (answered || !question) return

      const isCorrect = selected === question.capital
      setSelectedOption(selected)
      setAnswered(true)

      setStats(prev => {
        const newStreak = isCorrect ? prev.streak + 1 : 0
        const newBest = Math.max(prev.bestStreak, newStreak)
        const newStats: QuizStats = {
          streak: newStreak,
          bestStreak: newBest,
          totalCorrect: prev.totalCorrect + (isCorrect ? 1 : 0),
          totalAnswered: prev.totalAnswered + 1,
        }

        if (sessionIdRef.current) {
          const sid = sessionIdRef.current
          fetch('/api/quiz/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: sid,
              streak: newStats.streak,
              best_streak: newStats.bestStreak,
              total_correct: newStats.totalCorrect,
              total_answered: newStats.totalAnswered,
            }),
          }).catch(() => {})

          fetch('/api/quiz/answers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: sid,
              country_code: question.countryCode,
              difficulty,
              is_correct: isCorrect,
            }),
          }).catch(() => {})
        }

        return newStats
      })
    },
    [answered, question, difficulty]
  )

  return { question, answered, selectedOption, stats, handleAnswer }
}
