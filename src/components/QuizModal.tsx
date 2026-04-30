'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { glass } from '@/lib/mapConstants'
import { useCountryQuiz, type Difficulty } from '@/hooks/useCountryQuiz'
import { CAPITAL_NAMES_KO } from '@/data/capitalNamesKo'

type Props = {
  countryCode: string
  countryName: string
  onClose: () => void
  onNext?: () => void
}

const DIFFICULTY_COLORS: Record<Difficulty, { active: string; border: string; text: string }> = {
  easy:   { active: 'rgba(52,211,153,0.18)',  border: 'rgba(52,211,153,0.6)',  text: '#6ee7b7' },
  medium: { active: 'rgba(251,191,36,0.18)',  border: 'rgba(251,191,36,0.6)',  text: '#fcd34d' },
  hard:   { active: 'rgba(239,68,68,0.18)',   border: 'rgba(239,68,68,0.6)',   text: '#fca5a5' },
}

export default function QuizModal({ countryCode, countryName, onClose, onNext }: Props) {
  const t = useTranslations('Quiz')
  const locale = useLocale()

  const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('worldstats_quiz_difficulty') as Difficulty | null
      if (saved && ['easy', 'medium', 'hard'].includes(saved)) return saved
    }
    return 'medium'
  })

  const { question, answered, selectedOption, stats, handleAnswer } = useCountryQuiz({
    countryCode,
    countryName,
    difficulty,
  })

  const handleDifficultyChange = (d: Difficulty) => {
    setDifficulty(d)
    if (typeof window !== 'undefined') localStorage.setItem('worldstats_quiz_difficulty', d)
  }

  const accuracy =
    stats.totalAnswered > 0
      ? `${stats.totalCorrect}/${stats.totalAnswered}`
      : '0/0'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(5px)',
        padding: '16px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          ...glass,
          borderRadius: 20,
          padding: '22px 20px 18px',
          width: '100%',
          maxWidth: 440,
          position: 'relative',
          border: '1px solid rgba(167,139,250,0.25)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#c4b5fd', letterSpacing: '-0.01em' }}>
            {t('title')}
          </div>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => {
              const cols = DIFFICULTY_COLORS[d]
              const active = difficulty === d
              return (
                <button
                  key={d}
                  onClick={() => handleDifficultyChange(d)}
                  style={{
                    padding: '3px 9px',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    border: `1px solid ${active ? cols.border : 'rgba(255,255,255,0.1)'}`,
                    background: active ? cols.active : 'transparent',
                    color: active ? cols.text : '#4b5563',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {t(`difficulty_${d}` as `difficulty_${Difficulty}`)}
                </button>
              )
            })}
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#4b5563',
                fontSize: 16,
                cursor: 'pointer',
                padding: '2px 6px',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Question area */}
        {!question ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: '#4b5563', fontSize: 13 }}>
            {t('loading')}
          </div>
        ) : (
          <>
            {/* Country display */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              {question.flagSvg && (
                <img
                  src={question.flagSvg}
                  alt=""
                  style={{
                    width: 60,
                    height: 40,
                    objectFit: 'cover',
                    borderRadius: 5,
                    marginBottom: 10,
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'block',
                    margin: '0 auto 10px',
                  }}
                />
              )}
              <div style={{ fontSize: 21, fontWeight: 700, color: '#f1f5f9', marginBottom: 5 }}>
                {countryName}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{t('question')}</div>
            </div>

            {/* 2×2 options grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 9,
                marginBottom: 18,
              }}
            >
              {question.options.map((opt, i) => {
                let bg = 'rgba(255,255,255,0.04)'
                let border = 'rgba(255,255,255,0.1)'
                let color = '#d1d5db'
                let cursor = 'pointer'

                if (answered) {
                  cursor = 'default'
                  if (opt === question.capital) {
                    bg = 'rgba(52,211,153,0.14)'
                    border = 'rgba(52,211,153,0.55)'
                    color = '#6ee7b7'
                  } else if (opt === selectedOption) {
                    bg = 'rgba(239,68,68,0.14)'
                    border = 'rgba(239,68,68,0.55)'
                    color = '#fca5a5'
                  }
                }

                const code = question.optionCodes?.[i]
                const displayName = locale === 'ko' && code
                  ? (CAPITAL_NAMES_KO[code.toUpperCase()] ?? opt)
                  : opt

                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(opt)}
                    disabled={answered}
                    style={{
                      background: bg,
                      border: `1px solid ${border}`,
                      borderRadius: 12,
                      padding: '13px 10px',
                      color,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor,
                      textAlign: 'center',
                      transition: 'all 0.18s',
                      minHeight: 48,
                      lineHeight: 1.3,
                      wordBreak: 'break-word',
                    }}
                  >
                    {displayName}
                  </button>
                )
              })}
            </div>

            {/* Stats bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: answered ? 14 : 0,
                fontSize: 12,
              }}
            >
              <div style={{ color: stats.streak > 0 ? '#fbbf24' : '#4b5563' }}>
                {stats.streak > 0
                  ? t('streak', { count: stats.streak })
                  : t('noStreak')}
              </div>
              <div style={{ color: '#374151' }}>
                {t('best', { count: stats.bestStreak })}
                <span style={{ marginLeft: 8 }}>{accuracy}</span>
              </div>
            </div>

            {/* Post-answer buttons */}
            {answered && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {onNext && (
                  <button
                    onClick={onNext}
                    style={{
                      background: 'rgba(167,139,250,0.14)',
                      border: '1px solid rgba(167,139,250,0.4)',
                      borderRadius: 12,
                      padding: '10px 18px',
                      color: '#c4b5fd',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {t('nextSpin')} 🎰
                  </button>
                )}
                <button
                  onClick={onClose}
                  style={{
                    background: 'rgba(75,85,99,0.12)',
                    border: '1px solid rgba(75,85,99,0.3)',
                    borderRadius: 12,
                    padding: '10px 18px',
                    color: '#6b7280',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {t('close')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
