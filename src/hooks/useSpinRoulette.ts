'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { RefObject, MutableRefObject } from 'react'
import { geoOrthographic, geoCentroid } from 'd3-geo'
import type { Feature, Geometry } from 'geojson'
import isoCountries from 'i18n-iso-countries'
import { worldGeo, alpha2Map, centroidByAlpha2 } from '@/lib/geoData'
import { getLocale } from '@/lib/mapUtils'
import { CURATED_FACTS } from '@/data/countryFacts'

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

type CountryApiData = {
  population?: number
  area?: number
  landlocked?: boolean
  borders?: string[]
  languages?: Record<string, string>
  timezones?: string[]
  car?: { side?: string }
  tld?: string[]
}

function pickFunFact(
  alpha2: string,
  data: CountryApiData,
  rank: { popRank: number; areaRank: number },
): string {
  // 1순위: curated
  if (CURATED_FACTS[alpha2.toUpperCase()]) return CURATED_FACTS[alpha2.toUpperCase()]

  const candidates: string[] = []

  // 내륙국
  if (data.landlocked) candidates.push('바다와 접하지 않는 내륙국이에요')

  // 섬나라 (육지 국경 0개)
  if (Array.isArray(data.borders) && data.borders.length === 0 && !data.landlocked)
    candidates.push('어떤 나라와도 육지 국경을 공유하지 않는 섬나라예요')

  // 국경 많음
  if (Array.isArray(data.borders) && data.borders.length >= 8)
    candidates.push(`무려 ${data.borders.length}개 나라와 국경을 접해요`)

  // 언어 많음
  const langCount = data.languages ? Object.keys(data.languages).length : 0
  if (langCount >= 4) candidates.push(`공식 언어가 ${langCount}개인 다언어 국가예요`)

  // 시간대 많음
  const tzCount = data.timezones?.length ?? 0
  if (tzCount >= 5) candidates.push(`${tzCount}개의 시간대를 가진 나라예요`)

  // 좌측통행
  if (data.car?.side === 'left') candidates.push('영국처럼 좌측통행을 하는 나라예요')

  // 인구 극단
  if (rank.popRank === 1) candidates.push('세계에서 인구가 가장 많은 나라예요')
  else if (rank.popRank <= 5) candidates.push(`세계 인구 ${rank.popRank}위 대국이에요`)
  else if (rank.popRank >= 190) candidates.push('세계에서 인구가 가장 적은 나라 중 하나예요')

  // 면적 극단
  if (rank.areaRank === 1) candidates.push('지구에서 가장 넓은 나라예요')
  else if (rank.areaRank <= 5) candidates.push(`세계 면적 ${rank.areaRank}위 대국이에요`)
  else if (rank.areaRank >= 190) candidates.push('세계에서 가장 작은 나라 중 하나예요')

  // 인구밀도 극단 (면적·인구 모두 있을 때)
  const pop = data.population ?? 0
  const area = data.area ?? 0
  if (pop > 0 && area > 0) {
    const density = pop / area
    if (density > 1000) candidates.push(`인구밀도가 km²당 약 ${Math.round(density).toLocaleString()}명으로 매우 높아요`)
    else if (density < 5 && pop > 100000) candidates.push(`인구밀도가 km²당 약 ${density.toFixed(1)}명으로 매우 낮아요`)
  }

  if (candidates.length > 0) return candidates[Math.floor(Math.random() * candidates.length)]
  return '세계 곳곳을 탐험해보세요!'
}

import type { OverlayHandle } from '@/components/WorldMapOverlay'

type Deps = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  rotationRef: MutableRefObject<[number, number]>
  scaleRef: MutableRefObject<number>
  autoRotateRef: MutableRefObject<boolean>
  velocityRef: MutableRefObject<[number, number]>
  overlayRef: RefObject<OverlayHandle | null>
}

export function useSpinRoulette({ canvasRef, rotationRef, scaleRef, autoRotateRef, velocityRef, overlayRef }: Deps) {
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
    let active = true

    const tick = () => {
      if (!active) return
      if (step >= schedule.length) {
        slotFinalCountryRef.current = final
        overlayRef.current?.setRouletteSlot({ current: { alpha2: final.code, name: final.name }, phase: 'landing' })
        landingMarkerRef.current = { alpha2: final.code, startTime: performance.now() }
        
        Promise.all([
          fetch(`https://restcountries.com/v3.1/alpha/${final.code}?fields=population,area,region,capital,landlocked,borders,languages,timezones,car,tld`)
            .then(r => r.json()),
          getRankCache(),
        ]).then(([raw, ranks]) => {
          if (!active) return
          const data = Array.isArray(raw) ? raw[0] : raw
          const rank = ranks.get(final.code) ?? { popRank: 0, areaRank: 0 }
          const funFact = pickFunFact(final.code, data, rank)
          overlayRef.current?.setLandingFacts({
            population: data.population ?? 0,
            area: data.area ?? 0,
            region: data.region ?? '',
            capital: Array.isArray(data.capital) ? (data.capital[0] ?? '') : (data.capital ?? ''),
            popRank: rank.popRank,
            areaRank: rank.areaRank,
            funFact,
          })
        }).catch(() => {})

        timer = setTimeout(() => {
          if (!active) return
          overlayRef.current?.setRouletteSlot(null)
          overlayRef.current?.setLandingFacts(null)
          setIsSpinning(false)
        }, 3000)

        return
      }
      const a2 = allAlpha2[Math.floor(Math.random() * allAlpha2.length)]
      const name = isoCountries.getName(a2, LOCALE) ?? a2
      overlayRef.current?.setRouletteSlot({ current: { alpha2: a2, name }, phase: 'cycling' })
      
      timer = setTimeout(tick, schedule[step++])
    }
    timer = setTimeout(tick, 300)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [isSpinning, overlayRef])

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
