'use client'

import { useEffect, useRef, useState, useCallback, startTransition } from 'react'
import type { RefObject, MutableRefObject } from 'react'
import { geoOrthographic, geoCentroid } from 'd3-geo'
import type { Feature, Geometry } from 'geojson'
import isoCountries from 'i18n-iso-countries'
import { worldGeo, alpha2Map, centroidByAlpha2 } from '@/lib/geoData'
import { getLocale } from '@/lib/mapUtils'

const LOCALE = getLocale()

export type FireworkParticle = { x: number; y: number; vx: number; vy: number; t: number; size: number; color: string }
export type RouletteSlot = { current: { alpha2: string; name: string }; phase: 'cycling' | 'landing' }

type Deps = {
  setInfoCountry: (c: { code: string; name: string }) => void
  canvasRef: RefObject<HTMLCanvasElement | null>
  rotationRef: MutableRefObject<[number, number]>
  scaleRef: MutableRefObject<number>
  autoRotateRef: MutableRefObject<boolean>
  velocityRef: MutableRefObject<[number, number]>
}

export function useSpinRoulette({ setInfoCountry, canvasRef, rotationRef, scaleRef, autoRotateRef, velocityRef }: Deps) {
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
  }, [isSpinning, setInfoCountry])

  // 슬롯 랜딩 완료 → 1.4초 후 모달 오픈 + 오버레이 제거
  // isSpinning 타이밍과 완전히 독립적으로 동작
  useEffect(() => {
    if (!landingCountry) return
    const timer = setTimeout(() => {
      setInfoCountry(landingCountry)
      setRouletteSlot(null)
      setLandingCountry(null)
      setIsSpinning(false)
    }, 1400)
    return () => clearTimeout(timer)
  }, [landingCountry, setInfoCountry])

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
    spinningRef.current = true
    autoRotateRef.current = false
    velocityRef.current = [0, 0]
    setIsSpinning(true)
  }, [rotationRef, autoRotateRef, velocityRef])

  return {
    isSpinning,
    setIsSpinning,
    rouletteSlot,
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
