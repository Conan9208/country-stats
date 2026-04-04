'use client'

import { useEffect, useRef, useState, useCallback, startTransition } from 'react'
import type { RefObject, MutableRefObject } from 'react'
import { geoOrthographic, geoCentroid } from 'd3-geo'
import type { Feature, Geometry } from 'geojson'
import isoCountries from 'i18n-iso-countries'
import { worldGeo, alpha2Map, centroidByAlpha2 } from '@/lib/geoData'
import { getLocale } from '@/lib/mapUtils'

const LOCALE = getLocale()

// 전체 국가 인구·면적 순위 캐시 (앱 내 1회만 fetch)
let rankCache: Map<string, { popRank: number; areaRank: number }> | null = null
let rankCachePromise: Promise<Map<string, { popRank: number; areaRank: number }>> | null = null

function getRankCache(): Promise<Map<string, { popRank: number; areaRank: number }>> {
  if (rankCache) return Promise.resolve(rankCache)
  if (!rankCachePromise) {
    rankCachePromise = fetch('https://restcountries.com/v3.1/all?fields=cca2,population,area')
      .then(r => r.json())
      .then((all: { cca2: string; population: number; area: number }[]) => {
        const byPop  = [...all].sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
        const byArea = [...all].sort((a, b) => (b.area ?? 0) - (a.area ?? 0))
        const map = new Map<string, { popRank: number; areaRank: number }>()
        byPop.forEach((c, i) => map.set(c.cca2, { popRank: i + 1, areaRank: 0 }))
        byArea.forEach((c, i) => { const e = map.get(c.cca2); if (e) e.areaRank = i + 1 })
        rankCache = map
        return map
      })
      .catch(() => new Map<string, { popRank: number; areaRank: number }>())
  }
  return rankCachePromise
}

export type FireworkParticle = { x: number; y: number; vx: number; vy: number; t: number; size: number; color: string }
export type RouletteSlot = { current: { alpha2: string; name: string }; phase: 'cycling' | 'landing' }

type Deps = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  rotationRef: MutableRefObject<[number, number]>
  scaleRef: MutableRefObject<number>
  autoRotateRef: MutableRefObject<boolean>
  velocityRef: MutableRefObject<[number, number]>
}

export function useSpinRoulette({ canvasRef, rotationRef, scaleRef, autoRotateRef, velocityRef }: Deps) {
  const spinningRef = useRef(false)
  const spinStartRef = useRef<[number, number]>([0, 0])
  const spinTargetRef = useRef<[number, number]>([0, 0])
  const spinProgressRef = useRef(0)
  const spinTargetCountryRef = useRef<{ code: string; name: string } | null>(null)
  const spinCompleteRef = useRef<{ code: string; name: string } | null>(null)
  const slotFinalCountryRef = useRef<{ code: string; name: string } | null>(null)
  const spinJourneyRef = useRef(0)
  const fireworkParticlesRef = useRef<FireworkParticle[]>([])
  const [isSpinning, setIsSpinning] = useState(false)
  const [rouletteSlot, setRouletteSlot] = useState<RouletteSlot | null>(null)
  const [landingCountry, setLandingCountry] = useState<{ code: string; name: string } | null>(null)
  const [landingFacts, setLandingFacts] = useState<{
    population: number; area: number; region: string
    capital: string; popRank: number; areaRank: number
  } | null>(null)
  const landingMarkerRef = useRef<{ alpha2: string; startTime: number } | null>(null)

  // 스핀 완료 시: 폭죽 3웨이브
  useEffect(() => {
    if (!isSpinning && slotFinalCountryRef.current) {
      const country = slotFinalCountryRef.current
      slotFinalCountryRef.current = null
      for (let wave = 0; wave < 3; wave++) {
        setTimeout(() => {
          const canvas = canvasRef.current
          if (!canvas) return
          const size = Math.min(canvas.width, canvas.height)
          const proj = geoOrthographic()
            .scale(size * 1.6 * Math.pow(1.3, scaleRef.current))
            .translate([canvas.width / 2 - 128, canvas.height / 2])
            .rotate([rotationRef.current[0], rotationRef.current[1], 0])
            .clipAngle(90)
          const geo = centroidByAlpha2.get(country.code)
          const projected = geo ? proj(geo) : null
          if (!projected || !isFinite(projected[0]) || !isFinite(projected[1])) return
          const [px, py] = projected
          const now = performance.now()
          const COLORS = [
            'rgba(250,204,21', 'rgba(167,139,250', 'rgba(96,165,250',
            'rgba(244,114,182', 'rgba(52,211,153', 'rgba(251,146,60', 'rgba(255,255,255',
          ]
          const count = [35, 25, 18][wave]
          const baseSpeed = [70, 55, 40][wave]
          for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2
            const speed = baseSpeed + Math.random() * 100
            fireworkParticlesRef.current.push({
              x: px, y: py,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              t: now,
              size: 2.5 + Math.random() * 4,
              color: COLORS[Math.floor(Math.random() * COLORS.length)],
            })
          }
        }, wave * 220)
      }
    }
  }, [isSpinning, canvasRef, rotationRef, scaleRef])

  // 슬롯머신 나라 cycling (isSpinning 동안)
  useEffect(() => {
    if (!isSpinning) return
    const final = spinTargetCountryRef.current
    if (!final) return
    const allAlpha2 = [...alpha2Map.values()]
    const schedule = [
      ...Array(8).fill(75),
      ...Array(6).fill(120),
      ...Array(4).fill(180),
      ...Array(2).fill(280),
    ]
    let step = 0
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      if (step >= schedule.length) {
        slotFinalCountryRef.current = final
        setRouletteSlot({ current: { alpha2: final.code, name: final.name }, phase: 'landing' })
        setLandingCountry(final)
        landingMarkerRef.current = { alpha2: final.code, startTime: performance.now() }
        return
      }
      const a2 = allAlpha2[Math.floor(Math.random() * allAlpha2.length)]
      const name = isoCountries.getName(a2, LOCALE) ?? a2
      startTransition(() => {
        setRouletteSlot({ current: { alpha2: a2, name }, phase: 'cycling' })
      })
      timer = setTimeout(tick, schedule[step++])
    }
    timer = setTimeout(tick, 300)
    return () => clearTimeout(timer)
  }, [isSpinning])

  // 슬롯 랜딩 완료 → 팩트 + 순위 fetch + 3초 후 팩트카드 닫기
  useEffect(() => {
    if (!landingCountry) return
    let active = true
    Promise.all([
      fetch(`https://restcountries.com/v3.1/alpha/${landingCountry.code}?fields=population,area,region,capital`)
        .then(r => r.json()),
      getRankCache(),
    ]).then(([raw, ranks]) => {
      if (!active) return
      const data = Array.isArray(raw) ? raw[0] : raw
      const rank = ranks.get(landingCountry.code) ?? { popRank: 0, areaRank: 0 }
      setLandingFacts({
        population: data.population ?? 0,
        area: data.area ?? 0,
        region: data.region ?? '',
        capital: Array.isArray(data.capital) ? (data.capital[0] ?? '') : (data.capital ?? ''),
        popRank: rank.popRank,
        areaRank: rank.areaRank,
      })
    }).catch(() => {})
    const timer = setTimeout(() => {
      setRouletteSlot(null)
      setLandingCountry(null)
      setLandingFacts(null)
      setIsSpinning(false)
    }, 3000)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [landingCountry])

  const handleRandomSpin = useCallback(() => {
    if (spinningRef.current) return
    const valid = worldGeo.features.filter(f => {
      const id = String((f as Feature & { id?: string | number }).id ?? '')
      return alpha2Map.has(id)
    })
    const f = valid[Math.floor(Math.random() * valid.length)]
    const numericId = String((f as Feature & { id?: string | number }).id ?? '')
    const alpha2 = alpha2Map.get(numericId)!
    const name = isoCountries.getName(alpha2, LOCALE) ?? alpha2
    const centroid = centroidByAlpha2.get(alpha2) ?? (geoCentroid(f as Feature<Geometry>) as [number, number])
    const targetLambda = -centroid[0]
    const targetPhi = Math.max(-75, Math.min(75, -centroid[1]))
    const currentLambda = rotationRef.current[0]
    const currentPhi = rotationRef.current[1]
    const delta = ((targetLambda - currentLambda) % 360 + 360) % 360
    const journey = 720 + delta
    spinJourneyRef.current = journey
    spinStartRef.current = [currentLambda, currentPhi]
    spinTargetRef.current = [currentLambda + journey, targetPhi]
    spinProgressRef.current = 0
    spinTargetCountryRef.current = { code: alpha2, name }
    spinCompleteRef.current = null
    getRankCache()  // 스핀 중 순위 캐시 미리 준비
    spinningRef.current = true
    autoRotateRef.current = false
    velocityRef.current = [0, 0]
    setIsSpinning(true)
  }, [rotationRef, autoRotateRef, velocityRef])

  return {
    isSpinning,
    setIsSpinning,
    rouletteSlot,
    landingFacts,
    landingMarkerRef,
    spinningRef,
    spinStartRef,
    spinTargetRef,
    spinProgressRef,
    spinTargetCountryRef,
    spinCompleteRef,
    spinJourneyRef,
    fireworkParticlesRef,
    handleRandomSpin,
  }
}
