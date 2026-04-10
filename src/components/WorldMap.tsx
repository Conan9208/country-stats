'use client'
/* eslint-disable react-hooks/preserve-manual-memoization */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import type { Feature, Geometry, GeoJsonProperties } from 'geojson'
import isoCountries from 'i18n-iso-countries'
import localeKo from 'i18n-iso-countries/langs/ko.json'
import localeEn from 'i18n-iso-countries/langs/en.json'
import { geoOrthographic, geoPath } from 'd3-geo'
import StarField from '@/components/StarField'
import CommentPanel from '@/components/CommentPanel'
import DebtModal from '@/components/DebtModal'
import CountryInfoModal from '@/components/CountryInfoModal'
import StatsPanelOverlay from '@/components/StatsPanelOverlay'
import { WorldMapOverlay, type OverlayHandle } from '@/components/WorldMapOverlay'
import type { ClickData, ClickEntry } from '@/types/map'
import { TIERS, glass } from '@/lib/mapConstants'
import { countryColor, pollVoteColor, topN, topNToday } from '@/lib/mapUtils'
import { supabase } from '@/lib/supabase'
import { worldGeo, landGeo, bordersMesh, graticuleData, alpha2Map, featureByAlpha2, centroidByAlpha2 } from '@/lib/geoData'
import { useRealtimeViewers } from '@/hooks/useRealtimeViewers'
import { useSpinRoulette } from '@/hooks/useSpinRoulette'
import Link from 'next/link'
import AdminPanel from '@/components/AdminPanel'
import PinSubmitModal from '@/components/PinSubmitModal'
import PromoListPanel from '@/components/PromoListPanel'
import type { GlobePin } from '@/types/pin'
import { useLocale, useTranslations } from 'next-intl'

isoCountries.registerLocale(localeKo)
isoCountries.registerLocale(localeEn)


type WorldMapProps = {
  pollMode?: boolean
  onPollVote?: (alpha2: string, name: string) => void
  pollVotedCountry?: string | null
  pollData?: Record<string, number>
  pollQuestion?: { emoji: string; text: string } | null
  pollTotalVotes?: number
  pollMyVote?: string | null
  onCancelPollVote?: () => void
  onStartPoll?: () => void
}

export default function WorldMap({ pollMode, onPollVote, pollVotedCountry, pollData, pollQuestion, pollTotalVotes, pollMyVote, onCancelPollVote, onStartPoll }: WorldMapProps = {}) {
  const locale = useLocale()
  const t = useTranslations('Map')

  // refs so draw() can read latest props without being a dependency
  const pollModeRef         = useRef(pollMode)
  const pollVotedCountryRef = useRef(pollVotedCountry)
  const pollDataRef         = useRef(pollData)
  useEffect(() => { pollModeRef.current = pollMode }, [pollMode])
  useEffect(() => { pollVotedCountryRef.current = pollVotedCountry }, [pollVotedCountry])
  useEffect(() => { pollDataRef.current = pollData }, [pollData])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [clickData, setClickData] = useState<ClickData>({})
  const clickDataRef = useRef<ClickData>({})
  // 서버 확정 클릭수만 보관 — 낙관적 값 절대 들어오지 않음 → tooltip이 이 값을 읽음
  const confirmedCountRef = useRef<Record<string, number>>({})

  // 회전 상태 [lambda(경도), phi(위도)]
  const rotationRef = useRef<[number, number]>([-30, -20])
  // 줌 상태
  const scaleRef = useRef(0)
  // 드래그 시작점
  const dragStartRef = useRef<{ x: number; y: number; rotation: [number, number] } | null>(null)
  // 관성 velocity
  const velocityRef = useRef<[number, number]>([0, 0])
  const lastMouseRef = useRef<{ x: number; y: number; t: number } | null>(null)
  // hover된 나라 (ref로 관리 → React 리렌더 없음)
  const hoveredAlpha2Ref = useRef<string | null>(null)
  const hoveredNameRef   = useRef<string | null>(null)
  const overlayRef = useRef<OverlayHandle>(null)
  // 우클릭 컨텍스트 메뉴
  type ContextMenu = { x: number; y: number; alpha2: string; name: string }
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const contextMenuRef    = useRef<ContextMenu | null>(null)
  const selectedAlpha2Ref = useRef<string | null>(null)
  const closeContextMenu  = useCallback(() => {
    contextMenuRef.current    = null
    selectedAlpha2Ref.current = null
    setContextMenu(null)
  }, [])
  // 댓글 패널
  const [commentCountry, setCommentCountry] = useState<{ code: string; name: string } | null>(null)
  // 핀
  const pinsRef = useRef<GlobePin[]>([])
  const pinImgCacheRef = useRef<Map<string, HTMLImageElement>>(new Map())
  const [pinSubmitCountry, setPinSubmitCountry] = useState<{ code: string; name: string } | null>(null)
  const [activePinPopup, setActivePinPopup] = useState<{ alpha2: string; pins: GlobePin[]; countryName: string; x: number; y: number } | null>(null)
  // 모달
  const [debtCountry, setDebtCountry]   = useState<{ code: string; name: string } | null>(null)
  const [infoCountry, setInfoCountry]   = useState<{ code: string; name: string } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 내 클릭 기록 (localStorage)
  const myClicksRef = useRef<Set<string>>(new Set())
  const [myClickCount, setMyClickCount] = useState(0)
  const animFrameRef = useRef<number>(0)
  // 자동 회전
  const autoRotateRef = useRef(true)

  const { isSpinning, landingMarkerRef, spinningRef, spinStartRef, spinTargetRef, spinProgressRef, spinJourneyRef, fireworkParticlesRef, handleRandomSpin } = useSpinRoulette({ canvasRef, rotationRef, scaleRef, autoRotateRef, velocityRef, overlayRef })
  const { viewersByCountryRef, lastBroadcastCountryRef, presenceChannelRef, mySessionId } = useRealtimeViewers()

  // 이펙트
  type Shockwave = { x: number; y: number; t: number }
  type Particle  = { x: number; y: number; vx: number; vy: number; t: number; size: number }
  type Flash     = { alpha2: string; t: number }
  const shockwavesRef = useRef<Shockwave[]>([])
  const particlesRef  = useRef<Particle[]>([])
  const flashesRef    = useRef<Flash[]>([])
  const mousePosRef   = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    fetch('/api/clicks')
      .then(r => r.json())
      .then((data: ClickData) => {
        clickDataRef.current = data
        for (const [k, v] of Object.entries(data)) {
          confirmedCountRef.current[k] = v.total ?? 0
        }
        setClickData(data)
      })
  }, [])

  // 지구본 핀 로드 (1분마다 갱신)
  useEffect(() => {
    const load = () =>
      fetch('/api/pins?all=1')
        .then(r => r.json())
        .then((data: GlobePin[]) => { if (Array.isArray(data)) pinsRef.current = data })
        .catch(() => {})
    load()
    const iv = setInterval(load, 60_000)
    return () => clearInterval(iv)
  }, [])

  // localStorage에서 내 클릭 기록 불러오기
  useEffect(() => {
    try {
      const stored = localStorage.getItem('my_clicked_countries')
      if (stored) {
        const arr: string[] = JSON.parse(stored)
        myClicksRef.current = new Set(arr)
        setTimeout(() => setMyClickCount(arr.length), 0)
      }
    } catch { /* ignore */ }
  }, [])

  // 캔버스 밖 클릭 시 컨텍스트 메뉴 닫기
  useEffect(() => {
    const handler = () => { if (contextMenuRef.current) closeContextMenu() }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [closeContextMenu])

  // Supabase Realtime 구독 — 다른 사람이 클릭하면 내 화면도 업데이트
  useEffect(() => {
    const channel = supabase
      .channel('country_stats_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'country_views' },
        (payload) => {
          const row = payload.new as { country_code: string; view_count: number; name?: string }
          if (!row?.country_code) return
          const rtTotal = Math.max(
            confirmedCountRef.current[row.country_code] ?? 0,
            Number(row.view_count) || 0
          )
          confirmedCountRef.current[row.country_code] = rtTotal
          clickDataRef.current = {
            ...clickDataRef.current,
            [row.country_code]: {
              ...clickDataRef.current[row.country_code],
              total: Math.max(clickDataRef.current[row.country_code]?.total ?? 0, rtTotal),
              name: row.name ?? clickDataRef.current[row.country_code]?.name,
            },
          }
          setClickData({ ...clickDataRef.current })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'country_daily_views' },
        (payload) => {
          const row = payload.new as { country_code: string; view_count: number; view_date: string }
          if (!row?.country_code) return
          const today = new Date().toISOString().slice(0, 10)
          if (row.view_date !== today) return
          clickDataRef.current = {
            ...clickDataRef.current,
            [row.country_code]: {
              ...clickDataRef.current[row.country_code],
              today: Number(row.view_count) || 0,
            },
          }
          setClickData({ ...clickDataRef.current })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const getProjection = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const size = Math.min(canvas.width, canvas.height)
    // 화면보다 훨씬 큰 지구본 → 가까이서 보는 거대한 지구 느낌
    const baseScale = size * 1.6
    const scale = baseScale * Math.pow(1.3, scaleRef.current)
    return geoOrthographic()
      .scale(scale)
      .translate([canvas.width / 2 - 128, canvas.height / 2])
      .rotate([rotationRef.current[0], rotationRef.current[1], 0])
      .clipAngle(90)
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const proj = getProjection()
    if (!proj) return
    const path = geoPath(proj, ctx)

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 바다 (구 배경)
    ctx.beginPath()
    path({ type: 'Sphere' } as unknown as Feature<Geometry, GeoJsonProperties>)
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = proj.scale()
    const gradient = ctx.createRadialGradient(
      centerX - radius * 0.2, centerY - radius * 0.25, radius * 0.05,
      centerX, centerY, radius * 1.1
    )
    gradient.addColorStop(0, '#1a6fa8')
    gradient.addColorStop(0.5, '#0d4f7a')
    gradient.addColorStop(1, '#062840')
    ctx.fillStyle = gradient
    ctx.fill()

    // 위경도 격자선
    ctx.beginPath()
    path(graticuleData)
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 0.5
    ctx.stroke()

    // 육지 베이스
    ctx.beginPath()
    path(landGeo)
    ctx.fillStyle = '#2a5a3a'
    ctx.fill()

    // 국가별 색상
    for (const feature of worldGeo.features) {
      const numericId = String((feature as Feature & { id?: string | number }).id ?? '')
      const alpha2 = alpha2Map.get(numericId) ?? null
      const count = alpha2 ? (clickDataRef.current[alpha2]?.total ?? 0) : 0
      const isHovered   = alpha2 !== null && alpha2 === hoveredAlpha2Ref.current
      const isSelected  = alpha2 !== null && alpha2 === selectedAlpha2Ref.current
      const isPoll       = pollModeRef.current
      const isMyPollVote = isPoll && alpha2 !== null && alpha2 === pollVotedCountryRef.current
      const pData        = pollDataRef.current

      ctx.beginPath()
      path(feature)

      if (isSelected) {
        // 우클릭 선택 나라: 밝은 주황 + 테두리 강조
        ctx.fillStyle = 'rgba(251,146,60,0.55)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(251,146,60,0.9)'
        ctx.lineWidth = 1.5
        ctx.stroke()
      } else if (isMyPollVote) {
        // 내가 투표한 나라: emerald 강조
        ctx.fillStyle = 'rgba(52,211,153,0.6)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(52,211,153,0.95)'
        ctx.lineWidth = 1.5
        ctx.stroke()
      } else if (isHovered) {
        ctx.fillStyle = isPoll ? 'rgba(167,139,250,0.45)' : 'rgba(255,255,255,0.35)'
        ctx.fill()
      } else if (isPoll && pData && alpha2 && pData[alpha2]) {
        const maxVotes = Math.max(...Object.values(pData))
        ctx.fillStyle = pollVoteColor(pData[alpha2], maxVotes)
        ctx.globalAlpha = 0.75
        ctx.fill()
        ctx.globalAlpha = 1
      } else if (!isPoll && count > 0) {
        ctx.fillStyle = countryColor(count)
        ctx.globalAlpha = 0.7
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }

    // 국경선
    ctx.beginPath()
    path(bordersMesh)
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 0.4
    ctx.stroke()

    // 구 테두리
    ctx.beginPath()
    path({ type: 'Sphere' } as unknown as Feature<Geometry, GeoJsonProperties>)
    ctx.strokeStyle = 'rgba(100,180,255,0.25)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // 구 광택 효과
    const shineGrad = ctx.createRadialGradient(
      centerX - radius * 0.35, centerY - radius * 0.35, radius * 0.02,
      centerX - radius * 0.1, centerY - radius * 0.1, radius * 0.75
    )
    shineGrad.addColorStop(0, 'rgba(255,255,255,0.12)')
    shineGrad.addColorStop(0.4, 'rgba(255,255,255,0.03)')
    shineGrad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.beginPath()
    path({ type: 'Sphere' } as unknown as Feature<Geometry, GeoJsonProperties>)
    ctx.fillStyle = shineGrad
    ctx.fill()

    // 클릭 플래시 — 나라 위에 황금색 오버레이
    const now = performance.now()
    flashesRef.current = flashesRef.current.filter(f => now - f.t < 500)
    for (const flash of flashesRef.current) {
      const age = (now - flash.t) / 500
      const feature = featureByAlpha2.get(flash.alpha2)
      if (!feature) continue
      ctx.beginPath()
      path(feature)
      ctx.fillStyle = `rgba(250,204,21,${0.75 * (1 - age)})`
      ctx.fill()
    }

    // 충격파 (shockwave) — 빠르게 퍼지는 단일 링
    shockwavesRef.current = shockwavesRef.current.filter(s => now - s.t < 500)
    for (const sw of shockwavesRef.current) {
      const age = (now - sw.t) / 500
      const eased = 1 - Math.pow(1 - age, 3)   // ease-out cubic
      ctx.beginPath()
      ctx.arc(sw.x, sw.y, eased * 90, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(250,204,21,${(1 - age) * 0.9})`
      ctx.lineWidth = (1 - age) * 3.5
      ctx.stroke()
    }

    // 파티클 버스트
    particlesRef.current = particlesRef.current.filter(p => now - p.t < 600)
    for (const p of particlesRef.current) {
      const age = (now - p.t) / 600
      const eased = 1 - Math.pow(1 - age, 2)
      const px = p.x + p.vx * eased
      const py = p.y + p.vy * eased
      ctx.beginPath()
      ctx.arc(px, py, p.size * (1 - age), 0, Math.PI * 2)
      ctx.fillStyle = `rgba(250,204,21,${1 - age})`
      ctx.fill()
    }

    // 커서 — 글로우 도트 + 부드럽게 맥동하는 외곽 링
    const mp = mousePosRef.current
    if (mp) {
      const onCountry = hoveredAlpha2Ref.current !== null
      const pulse = (Math.sin(now * 0.004) + 1) / 2        // 0→1 맥동
      const outerR = 14 + pulse * 5                          // 14~19px
      const outerA = 0.35 + pulse * 0.25                     // 0.35~0.60
      const cr = onCountry ? '250,204,21' : '255,255,255'

      // 소프트 글로우
      const glow = ctx.createRadialGradient(mp.x, mp.y, 0, mp.x, mp.y, outerR * 2)
      glow.addColorStop(0,   `rgba(${cr},${onCountry ? 0.18 : 0.08})`)
      glow.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.beginPath()
      ctx.arc(mp.x, mp.y, outerR * 2, 0, Math.PI * 2)
      ctx.fillStyle = glow
      ctx.fill()

      // 외곽 링
      ctx.beginPath()
      ctx.arc(mp.x, mp.y, outerR, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(${cr},${outerA})`
      ctx.lineWidth = 1
      ctx.stroke()

      // 중심 도트
      ctx.beginPath()
      ctx.arc(mp.x, mp.y, onCountry ? 4 : 3, 0, Math.PI * 2)
      ctx.fillStyle = onCountry ? '#facc15' : 'rgba(255,255,255,0.9)'
      ctx.fill()
    }

    // 실시간 뷰어 점 — 다른 사람이 보고 있는 나라 표시
    const viewerCounts = viewersByCountryRef.current
    const cLng0 = -rotationRef.current[0] * Math.PI / 180
    const cLat0 = -rotationRef.current[1] * Math.PI / 180
    for (const [alpha2, count] of Object.entries(viewerCounts)) {
      if (count === 0) continue
      const geo = centroidByAlpha2.get(alpha2)
      if (!geo) continue
      const pLng = geo[0] * Math.PI / 180
      const pLat = geo[1] * Math.PI / 180
      // 가시 반구 체크 (dot product > 0)
      const dot = Math.cos(pLat) * Math.cos(cLat0) * Math.cos(pLng - cLng0)
                + Math.sin(pLat) * Math.sin(cLat0)
      if (dot <= 0.05) continue
      const projected = proj(geo)
      if (!projected) continue
      const [px, py] = projected
      if (!isFinite(px) || !isFinite(py)) continue
      const pulse = (Math.sin(now * 0.005 + px * 0.01) + 1) / 2
      const dotR = 2.5 + pulse * 1.5
      // 글로우
      const vGlow = ctx.createRadialGradient(px, py, 0, px, py, dotR * 4)
      vGlow.addColorStop(0, `rgba(192,132,252,${0.25 + pulse * 0.15})`)
      vGlow.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.beginPath()
      ctx.arc(px, py, dotR * 4, 0, Math.PI * 2)
      ctx.fillStyle = vGlow
      ctx.fill()
      // 점
      ctx.beginPath()
      ctx.arc(px, py, dotR, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(192,132,252,${0.85 + pulse * 0.15})`
      ctx.fill()
      // 2명 이상이면 숫자
      if (count > 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.font = 'bold 8px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(String(count), px + 6, py - 3)
        ctx.textAlign = 'left'
      }
    }

    // 지구본 홍보 핀 렌더링 (로고 이미지 기반)
    // 줌 레벨에 따라 핀 크기 동적 조절
    const pinZoomFactor = Math.pow(1.3, scaleRef.current)
    const pinRadius = Math.max(5, Math.min(22, Math.round(9 * Math.sqrt(pinZoomFactor))))
    const pinDiameter = pinRadius * 2
    // 50% 겹침: 이웃 핀 중심간 거리 = pinRadius (직경의 절반)
    const pinSpacing = pinRadius

    const pinsByCountryMap = new Map<string, GlobePin[]>()
    for (const pin of pinsRef.current) {
      const list = pinsByCountryMap.get(pin.country_alpha2) ?? []
      list.push(pin)
      pinsByCountryMap.set(pin.country_alpha2, list)
    }
    for (const [alpha2, pins] of pinsByCountryMap) {
      const geo = centroidByAlpha2.get(alpha2)
      if (!geo) continue
      const pLng = geo[0] * Math.PI / 180
      const pLat = geo[1] * Math.PI / 180
      const cLng1 = -rotationRef.current[0] * Math.PI / 180
      const cLat1 = -rotationRef.current[1] * Math.PI / 180
      const dot2 = Math.cos(pLat) * Math.cos(cLat1) * Math.cos(pLng - cLng1)
                 + Math.sin(pLat) * Math.sin(cLat1)
      if (dot2 <= 0.05) continue
      const projected = proj(geo)
      if (!projected) continue
      const [px, py] = projected
      if (!isFinite(px) || !isFinite(py)) continue
      const pulse2 = (Math.sin(now * 0.004 + py * 0.02) + 1) / 2

      // 글로우
      const glowRadius = pinDiameter
      const pinGlow = ctx.createRadialGradient(px, py, 0, px, py, glowRadius)
      pinGlow.addColorStop(0, `rgba(167,139,250,${0.18 + pulse2 * 0.12})`)
      pinGlow.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.beginPath()
      ctx.arc(px, py, glowRadius, 0, Math.PI * 2)
      ctx.fillStyle = pinGlow
      ctx.fill()

      // 최대 3개 원형 아이콘 가로 배치
      const shown = pins.slice(0, 3)
      const startX = px - (shown.length - 1) * (pinSpacing / 2)
      for (let i = 0; i < shown.length; i++) {
        const pin = shown[i]
        const ix = startX + i * pinSpacing

        if (pin.logo_url) {
          let img = pinImgCacheRef.current.get(pin.logo_url)
          if (!img) {
            img = new window.Image()
            img.crossOrigin = 'anonymous'  // crossOrigin은 반드시 src 전에 설정
            img.src = pin.logo_url
            img.onerror = () => { pinImgCacheRef.current.delete(pin.logo_url!) }
            pinImgCacheRef.current.set(pin.logo_url, img)
          }
          if (img.complete && img.naturalWidth > 0) {
            ctx.save()
            ctx.beginPath()
            ctx.arc(ix, py, pinRadius, 0, Math.PI * 2)
            ctx.clip()
            ctx.drawImage(img, ix - pinRadius, py - pinRadius, pinDiameter, pinDiameter)
            ctx.restore()
            ctx.beginPath()
            ctx.arc(ix, py, pinRadius, 0, Math.PI * 2)
            ctx.strokeStyle = 'rgba(255,255,255,0.75)'
            ctx.lineWidth = 1.5
            ctx.stroke()
          } else {
            // 로딩 중 fallback
            ctx.beginPath()
            ctx.arc(ix, py, pinRadius, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(167,139,250,0.5)'
            ctx.fill()
            ctx.font = `${Math.round(pinRadius * 1.1)}px serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText('📌', ix, py)
          }
        } else {
          // 로고 없음: 이니셜 원형
          ctx.beginPath()
          ctx.arc(ix, py, pinRadius, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(167,139,250,0.8)'
          ctx.fill()
          ctx.beginPath()
          ctx.arc(ix, py, pinRadius, 0, Math.PI * 2)
          ctx.strokeStyle = 'rgba(255,255,255,0.5)'
          ctx.lineWidth = 1.5
          ctx.stroke()
          ctx.font = `bold ${Math.max(7, Math.round(pinRadius * 0.85))}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = '#fff'
          ctx.fillText((pin.business_name.charAt(0) || '?').toUpperCase(), ix, py)
        }
        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'
      }

      // 4개 이상이면 "+N" 뱃지
      if (pins.length > 3) {
        const bx = startX + (shown.length - 1) * pinSpacing + pinRadius + 5
        const by2 = py - pinRadius * 0.7
        const badgeR = Math.max(5, Math.round(pinRadius * 0.75))
        ctx.beginPath()
        ctx.arc(bx, by2, badgeR, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(250,204,21,0.9)'
        ctx.fill()
        ctx.font = `bold ${Math.max(6, badgeR - 1)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#1a1a1a'
        ctx.fillText(`+${pins.length - 3}`, bx, by2)
        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'
      }
    }

    // 폭죽 이펙트 (3웨이브 컬러 파티클)
    fireworkParticlesRef.current = fireworkParticlesRef.current.filter(p => now - p.t < 1600)
    for (const p of fireworkParticlesRef.current) {
      const ageSec = (now - p.t) / 1000
      const alpha = Math.max(0, ageSec < 0.65 ? 1 : 1 - (ageSec - 0.65) / 0.95)
      if (alpha <= 0) continue
      const px2 = p.x + p.vx * ageSec
      const py2 = p.y + p.vy * ageSec + 200 * ageSec * ageSec  // 중력
      const r = Math.max(0, p.size * (1 - ageSec * 0.5))
      if (r <= 0) continue
      ctx.beginPath()
      ctx.arc(px2, py2, r, 0, Math.PI * 2)
      ctx.fillStyle = `${p.color},${alpha.toFixed(2)})`
      ctx.fill()
    }

    // 스핀 랜딩 위치 마커 — 3개의 펄스 링이 나라 중심에서 확산
    const lm = landingMarkerRef.current
    if (lm) {
      const elapsed = now - lm.startTime
      const DURATION = 4000
      if (elapsed < DURATION) {
        const geo = centroidByAlpha2.get(lm.alpha2)
        if (geo) {
          const cLng0 = -rotationRef.current[0] * Math.PI / 180
          const cLat0 = -rotationRef.current[1] * Math.PI / 180
          const pLng  = geo[0] * Math.PI / 180
          const pLat  = geo[1] * Math.PI / 180
          const dot   = Math.cos(pLat) * Math.cos(cLat0) * Math.cos(pLng - cLng0)
                      + Math.sin(pLat) * Math.sin(cLat0)
          if (dot > 0.05) {
            const projected = proj(geo)
            if (projected && isFinite(projected[0]) && isFinite(projected[1])) {
              const [mx, my] = projected
              for (let i = 0; i < 3; i++) {
                const ringPhase = ((elapsed / 900) + i * 0.333) % 1
                const ringR = ringPhase * 40
                const ringA = (1 - ringPhase) * 0.75
                ctx.beginPath()
                ctx.arc(mx, my, ringR, 0, Math.PI * 2)
                ctx.strokeStyle = `rgba(167,139,250,${ringA.toFixed(2)})`
                ctx.lineWidth = 2
                ctx.stroke()
              }
              ctx.beginPath()
              ctx.arc(mx, my, 5, 0, Math.PI * 2)
              ctx.fillStyle = 'rgba(167,139,250,0.9)'
              ctx.fill()
            }
          }
        }
      } else {
        landingMarkerRef.current = null
      }
    }
  }, [getProjection, landingMarkerRef, viewersByCountryRef, fireworkParticlesRef])

  // 자동 회전 + 관성 + 스핀 루프
  useEffect(() => {
    let last = performance.now()
    const loop = (now: number) => {
      const dt = now - last
      last = now
      if (spinningRef.current) {
        // 스핀 애니메이션: 고속 선형(55%) → ease-out cubic 감속(45%), 총 3000ms
        spinProgressRef.current = Math.min(1, spinProgressRef.current + dt / 3000)
        const p = spinProgressRef.current
        const FAST_T = 0.55   // 55%까지 선형 고속
        const FAST_D = 0.65   // 선형 구간이 전체 거리의 65% 소화
        let lambda: number
        if (p <= FAST_T) {
          lambda = spinStartRef.current[0] + (p / FAST_T) * FAST_D * spinJourneyRef.current
        } else {
          const t2 = (p - FAST_T) / (1 - FAST_T)
          const eased = 1 - Math.pow(1 - t2, 3)
          lambda = spinStartRef.current[0] + (FAST_D + eased * (1 - FAST_D)) * spinJourneyRef.current
        }
        const phiEased = 1 - Math.pow(1 - p, 3)
        rotationRef.current = [
          lambda,
          spinStartRef.current[1] + (spinTargetRef.current[1] - spinStartRef.current[1]) * phiEased,
        ]
        if (spinProgressRef.current >= 1) {
          spinningRef.current = false
          autoRotateRef.current = true
        }
      } else if (!dragStartRef.current) {
        const [vx, vy] = velocityRef.current
        if (Math.abs(vx) > 0.0001 || Math.abs(vy) > 0.0001) {
          rotationRef.current = [
            rotationRef.current[0] + vx * dt,
            Math.max(-90, Math.min(90, rotationRef.current[1] - vy * dt)),
          ]
          velocityRef.current = [vx * 0.88, vy * 0.88]
        } else if (autoRotateRef.current && !contextMenuRef.current) {
          rotationRef.current = [rotationRef.current[0] + dt * 0.004, rotationRef.current[1]]
          velocityRef.current = [0, 0]
        }
      }
      draw()
      animFrameRef.current = requestAnimationFrame(loop)
    }
    animFrameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [draw, spinJourneyRef, spinProgressRef, spinStartRef, spinTargetRef, spinningRef])

  // 캔버스 크기 맞추기
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // 마우스 위치 → 나라 찾기
  const getAlpha2AtPoint = useCallback((x: number, y: number) => {
    const proj = getProjection()
    if (!proj) return null
    const coords = proj.invert?.([x, y])
    if (!coords) return null
    const path = geoPath(proj)
    for (const feature of [...worldGeo.features].reverse()) {
      if (path.measure(feature) === 0) continue
      try {
        if (geoPath(proj).bounds(feature) && path.area(feature) > 0) {
          // point-in-polygon check
        }
      } catch { /* skip */ }
      const numericId = String((feature as Feature & { id?: string | number }).id ?? '')
      const alpha2 = isoCountries.numericToAlpha2(numericId)
      // canvas point-in-path check
      const canvas = canvasRef.current
      if (!canvas) continue
      const ctx = canvas.getContext('2d')
      if (!ctx) continue
      ctx.beginPath()
      geoPath(proj, ctx)(feature)
      if (ctx.isPointInPath(x, y)) {
        return { alpha2, numericId, feature }
      }
    }
    return null
  }, [getProjection])

  const hasDraggedRef = useRef(false)

  // 드래그
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    hasDraggedRef.current = false   // spin 여부와 무관하게 항상 초기화
    if (spinningRef.current) return
    autoRotateRef.current = false
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      rotation: [...rotationRef.current] as [number, number],
    }
  }, [spinningRef])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    mousePosRef.current = { x, y }

    if (dragStartRef.current) {
      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y
      const proj = getProjection()
      const sensitivity = proj ? (180 / Math.PI) / proj.scale() : 0.05
      rotationRef.current = [
        dragStartRef.current.rotation[0] + dx * sensitivity,
        Math.max(-90, Math.min(90, dragStartRef.current.rotation[1] - dy * sensitivity)),
      ]
      // velocity 추적
      const now = performance.now()
      const last = lastMouseRef.current
      if (last) {
        const dt = Math.max(1, now - last.t)
        velocityRef.current = [
          (e.clientX - last.x) / dt * sensitivity,
          (e.clientY - last.y) / dt * sensitivity,
        ]
      }
      lastMouseRef.current = { x: e.clientX, y: e.clientY, t: now }
      // 6px 임계값: 미세한 손떨림이 클릭을 막지 않도록
      if (Math.sqrt(dx * dx + dy * dy) > 6) {
        hasDraggedRef.current = true
        hoveredAlpha2Ref.current = null
        overlayRef.current?.setTooltip(null)
      }
      return
    }

    // hover 감지
    const hit = getAlpha2AtPoint(x, y)
    if (hit?.alpha2) {
      // confirmedCountRef: 서버 확정값만 — 낙관적 값 절대 안 들어옴
      const count = confirmedCountRef.current[hit.alpha2] ?? 0
      const name = isoCountries.getName(hit.alpha2.toUpperCase(), locale)
        ?? clickDataRef.current[hit.alpha2]?.name
        ?? hit.alpha2
      hoveredAlpha2Ref.current = hit.alpha2
      hoveredNameRef.current   = name
      overlayRef.current?.setTooltip({ name, count, x: e.clientX - rect.left, y: e.clientY - rect.top, alpha2: hit.alpha2, viewers: viewersByCountryRef.current[hit.alpha2] ?? 0 })
      // 뷰어 broadcast — 나라가 바뀔 때만 전송
      if (hit.alpha2 !== lastBroadcastCountryRef.current) {
        lastBroadcastCountryRef.current = hit.alpha2
        presenceChannelRef.current?.send({
          type: 'broadcast', event: 'hover',
          payload: { sessionId: mySessionId.current, countryCode: hit.alpha2, ts: Date.now() },
        })
      }
    } else {
      hoveredAlpha2Ref.current = null
      hoveredNameRef.current   = null
      overlayRef.current?.setTooltip(null)
      if (lastBroadcastCountryRef.current !== null) {
        lastBroadcastCountryRef.current = null
        presenceChannelRef.current?.send({
          type: 'broadcast', event: 'hover',
          payload: { sessionId: mySessionId.current, countryCode: null, ts: Date.now() },
        })
      }
    }
  }, [getAlpha2AtPoint, getProjection, lastBroadcastCountryRef, mySessionId, presenceChannelRef, viewersByCountryRef, locale])

  const onMouseUp = useCallback(() => {
    dragStartRef.current = null
    lastMouseRef.current = null
  }, [])

  const onMouseLeave = useCallback(() => {
    dragStartRef.current = null
    mousePosRef.current = null
    lastMouseRef.current = null
    hoveredAlpha2Ref.current = null
    overlayRef.current?.setTooltip(null)
    autoRotateRef.current = true
    if (lastBroadcastCountryRef.current !== null) {
      lastBroadcastCountryRef.current = null
      presenceChannelRef.current?.send({
        type: 'broadcast', event: 'hover',
        payload: { sessionId: mySessionId.current, countryCode: null, ts: Date.now() },
      })
    }
  }, [lastBroadcastCountryRef, mySessionId, presenceChannelRef])

  const onPollVoteRef = useRef(onPollVote)
  useEffect(() => { onPollVoteRef.current = onPollVote }, [onPollVote])

  // 핀 히트 테스트 — 클릭 좌표 근처에 핀이 있는 나라의 모든 핀 반환
  const getPinsAtPoint = useCallback((cx: number, cy: number): { alpha2: string; pins: GlobePin[]; countryName: string } | null => {
    const proj = getProjection()
    if (!proj) return null
    const cLng = -rotationRef.current[0] * Math.PI / 180
    const cLat = -rotationRef.current[1] * Math.PI / 180

    // 나라별로 그룹화
    const pinsByCountry = new Map<string, GlobePin[]>()
    for (const pin of pinsRef.current) {
      const list = pinsByCountry.get(pin.country_alpha2) ?? []
      list.push(pin)
      pinsByCountry.set(pin.country_alpha2, list)
    }

    for (const [alpha2, pins] of pinsByCountry) {
      const geo = centroidByAlpha2.get(alpha2)
      if (!geo) continue
      const pLng = geo[0] * Math.PI / 180
      const pLat = geo[1] * Math.PI / 180
      const dot = Math.cos(pLat) * Math.cos(cLat) * Math.cos(pLng - cLng)
                + Math.sin(pLat) * Math.sin(cLat)
      if (dot <= 0.05) continue
      const projected = proj(geo)
      if (!projected) continue
      const [px, py] = projected
      if (!isFinite(px) || !isFinite(py)) continue

      // 나라별 표시 위치 계산 (draw loop와 동일한 pinRadius 계산)
      const hitZoom = Math.pow(1.3, scaleRef.current)
      const hitRadius = Math.max(5, Math.min(22, Math.round(9 * Math.sqrt(hitZoom))))
      const hitSpacing = hitRadius // draw loop와 동일한 50% 겹침
      const shown = pins.slice(0, 3)
      const startX = px - (shown.length - 1) * (hitSpacing / 2)
      for (let i = 0; i < shown.length; i++) {
        const ix = startX + i * hitSpacing
        const dist = Math.sqrt((cx - ix) ** 2 + (cy - py) ** 2)
        if (dist <= hitRadius + 7) {
          const hitLocale = 'ko'
          const countryName = isoCountries.getName(alpha2, hitLocale) ?? alpha2
          return { alpha2, pins, countryName }
        }
      }
    }
    return null
  }, [getProjection])

  const onClick = useCallback(async (e: React.MouseEvent) => {
    if (contextMenuRef.current) { closeContextMenu(); return }
    if (hasDraggedRef.current) return

    // 핀 클릭 감지 (나라 클릭보다 우선)
    const canvas = canvasRef.current
    if (canvas) {
      const rect = canvas.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const hit = getPinsAtPoint(cx, cy)
      if (hit) {
        setActivePinPopup({ alpha2: hit.alpha2, pins: hit.pins, countryName: hit.countryName, x: e.clientX, y: e.clientY })
        return
      }
    }

    const alpha2 = hoveredAlpha2Ref.current
    if (!alpha2) return
    const name = hoveredNameRef.current ?? alpha2

    // 투표 모드: 즉시 모달 오픈 → API는 백그라운드 처리
    if (pollModeRef.current) {
      onPollVoteRef.current?.(alpha2, name)
      fetch('/api/polls/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alpha2 }),
      }).catch(() => { /* 네트워크 오류는 조용히 무시 */ })
      return
    }

    const clickCanvas = canvasRef.current
    if (!clickCanvas) return
    const rect = clickCanvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // 즉시 이펙트
    const perfT = performance.now()
    shockwavesRef.current.push({ x, y, t: perfT })
    flashesRef.current.push({ alpha2, t: perfT })
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const speed = 55 + Math.random() * 30
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        t: perfT,
        size: 2.5 + Math.random() * 1.5,
      })
    }

    // 클릭 위치 미리 캡처 (await 이후엔 synthetic event 접근 불가)
    const container = containerRef.current
    const cRect = container?.getBoundingClientRect()
    const fx = cRect ? e.clientX - cRect.left : x
    const fy = cRect ? e.clientY - cRect.top  : y

    // 낙관적 업데이트: 지구본 색상만 즉시 반영 (confirmedCountRef/tooltip은 건드리지 않음)
    const prevTotal = clickDataRef.current[alpha2]?.total ?? 0
    clickDataRef.current = {
      ...clickDataRef.current,
      [alpha2]: { ...clickDataRef.current[alpha2], name, total: prevTotal + 1 },
    }

    // +1 float 즉시 표시 → 429 오면 같은 float을 😤 로 교체 (double float 방지)
    const floatId = Date.now() + Math.random()
    overlayRef.current?.addFloatNum(floatId, fx, fy, 1)
    const floatCleanup = setTimeout(
      () => overlayRef.current?.removeFloatNum(floatId), 1000
    )

    // 백그라운드에서 실제 API 호출
    const res = await fetch('/api/clicks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alpha2, name }),
    })

    if (res.status === 429) {
      // 낙관적 +1 롤백 (지구본 색상용)
      clickDataRef.current = {
        ...clickDataRef.current,
        [alpha2]: { ...clickDataRef.current[alpha2], total: prevTotal },
      }
      setClickData({ ...clickDataRef.current })
      // +1 float → 😤 로 in-place 교체 (새 float 추가 X → double float 없음)
      clearTimeout(floatCleanup)
      overlayRef.current?.rateLimitFloatNum(floatId)
      setTimeout(() => overlayRef.current?.removeFloatNum(floatId), 1400)
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      overlayRef.current?.setToast({ message: t('toastRateLimitTitle'), sub: t('toastRateLimitSub') })
      toastTimerRef.current = setTimeout(() => overlayRef.current?.setToast(null), 3000)
      return
    }

    if (!res.ok) {
      clickDataRef.current = {
        ...clickDataRef.current,
        [alpha2]: { ...clickDataRef.current[alpha2], total: prevTotal },
      }
      setClickData({ ...clickDataRef.current })
      return
    }

    const updated: { total: number; today: number } = await res.json()
    // confirmedCountRef: 서버 확정값만, Math.max로 순서 뒤바뀐 응답도 안전하게
    const confirmedTotal = Math.max(confirmedCountRef.current[alpha2] ?? 0, updated.total)
    confirmedCountRef.current[alpha2] = confirmedTotal
    const merged: ClickEntry = { name, total: confirmedTotal, today: updated.today }
    clickDataRef.current = { ...clickDataRef.current, [alpha2]: merged }
    setClickData({ ...clickDataRef.current })
    // +1 float은 이미 떠있음, floatCleanup 타이머가 1초 후 자동 제거

    // 내 클릭 기록 저장
    if (!myClicksRef.current.has(alpha2)) {
      myClicksRef.current.add(alpha2)
      setMyClickCount(myClicksRef.current.size)
      try { localStorage.setItem('my_clicked_countries', JSON.stringify([...myClicksRef.current])) } catch { /* ignore */ }
    }

    // 댓글 패널 열기
    setCommentCountry({ code: alpha2, name })
  }, [closeContextMenu, t])

  // 스크롤 줌 — passive: false로 직접 등록 (React onWheel은 passive라 preventDefault 불가)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      scaleRef.current = Math.max(-3, Math.min(7, scaleRef.current - e.deltaY * 0.003))
    }
    canvas.addEventListener('wheel', handler, { passive: false })
    return () => canvas.removeEventListener('wheel', handler)
  }, [])

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    // hover 상태 우선, 없으면 클릭 위치에서 직접 hit-test
    let alpha2 = hoveredAlpha2Ref.current
    let name   = hoveredNameRef.current
    if (!alpha2) {
      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        const hit = getAlpha2AtPoint(e.clientX - rect.left, e.clientY - rect.top)
        if (hit?.alpha2) {
          alpha2 = hit.alpha2
          name = isoCountries.getName(hit.alpha2.toUpperCase(), locale) ?? hit.alpha2
        }
      }
    }
    if (!alpha2 || !name) return
    selectedAlpha2Ref.current = alpha2
    const menu = { x: e.clientX, y: e.clientY, alpha2, name }
    contextMenuRef.current = menu
    setContextMenu(menu)
  }, [getAlpha2AtPoint, locale])

  const handleMenuSelect = useCallback((action: 'info' | 'debt' | 'comment' | 'pin', alpha2: string, name: string) => {
    closeContextMenu()
    if (action === 'info')    setInfoCountry({ code: alpha2, name })
    if (action === 'debt')    setDebtCountry({ code: alpha2, name })
    if (action === 'comment') setCommentCountry({ code: alpha2, name })
    if (action === 'pin')     setPinSubmitCountry({ code: alpha2, name })
  }, [closeContextMenu])

  const allTimeTop = useMemo(() => topN(clickData, locale), [clickData, locale])
  const todayTop = useMemo(() => topNToday(clickData, locale), [clickData, locale])
  const totalClicks = useMemo(() => Object.values(clickData).reduce((s, e) => s + (Number(e.total) || 0), 0), [clickData])

  return (
    <div ref={containerRef} style={{ position: 'relative', height: '100%', width: '100%', background: '#050a10', overflow: 'hidden' }}>
      <StarField />
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', cursor: 'none', position: 'relative', zIndex: 1, background: 'transparent' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        onContextMenu={onContextMenu}
      />

      <WorldMapOverlay ref={overlayRef} />

      {/* 안내 — 좌상단 */}
      <div style={{ ...glass, position: 'absolute', top: 16, left: 16, zIndex: 1000, borderRadius: 12, padding: '10px 16px', lineHeight: 1.35 }}>
        {/* POLL_DISABLED: pollMode 분기 제거, 항상 일반 안내 표시 */}
        <>
          <div style={{ fontFamily: "'Bungee', cursive", letterSpacing: '0.04em', fontSize: 15, color: '#f1f5f9' }}>
            <span style={{ color: '#34d399' }}>❤ Left click</span>
            <span style={{ color: '#64748b', margin: '0 6px', fontFamily: 'inherit' }}>—</span>
            <span style={{ color: '#cbd5e1' }}>you love this country</span>
          </div>
          <div style={{ fontFamily: "'Bungee', cursive", letterSpacing: '0.04em', fontSize: 15, color: '#f1f5f9', marginTop: 3 }}>
            <span style={{ color: '#a78bfa' }}>🔍 Right click</span>
            <span style={{ color: '#64748b', margin: '0 6px', fontFamily: 'inherit' }}>—</span>
            <span style={{ color: '#cbd5e1' }}>wanna know more?</span>
          </div>
          <div style={{ fontSize: 10, color: '#334155', marginTop: 6, letterSpacing: '0.03em' }}>
            drag · scroll to zoom · spin the globe
          </div>
        </>
      </div>

      {/* 댓글 패널 */}
      {commentCountry && (
        <CommentPanel
          countryCode={commentCountry.code}
          countryName={commentCountry.name}
          onClose={() => setCommentCountry(null)}
        />
      )}

      {/* 통계 패널 — 우상단 · 항상 표시 */}
      <StatsPanelOverlay
        commentCountry={commentCountry}
        totalClicks={totalClicks}
        myClickCount={myClickCount}
        allTimeTop={allTimeTop}
        todayTop={todayTop}
        onSelectCountry={setCommentCountry}
        pollTotalVotes={pollTotalVotes}
        pollQuestion={pollQuestion}
        pollData={pollData}
        pollMyVote={pollMyVote}
        onCancelPollVote={onCancelPollVote}
        onStartPoll={onStartPoll}
      />

      {/* 우클릭 컨텍스트 메뉴 */}
      {contextMenu && (
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 2000,
            ...glass,
            borderRadius: 12,
            padding: '6px 0',
            minWidth: 200,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ fontSize: 11, color: '#475569', padding: '6px 14px 4px', fontWeight: 700, letterSpacing: '0.06em' }}>
            {contextMenu.name}
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '4px 0' }} />
          {(['info', 'comment', 'pin'] as const).map((action) => {
            const labels = { info: t('contextInfo'), comment: t('contextComment'), pin: t('contextPin') }
            return (
              <button
                key={action}
                onClick={() => handleMenuSelect(action, contextMenu.alpha2, contextMenu.name)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 14px', fontSize: 13, color: '#e2e8f0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                {labels[action]}
              </button>
            )
          })}
        </div>
      )}

      {/* 모달 */}
      {debtCountry && <DebtModal code={debtCountry.code} name={debtCountry.name} onClose={() => setDebtCountry(null)} />}
      {infoCountry && <CountryInfoModal code={infoCountry.code} name={infoCountry.name} onClose={() => setInfoCountry(null)} />}

      {/* 핀 등록 모달 */}
      {pinSubmitCountry && (
        <PinSubmitModal
          countryName={pinSubmitCountry.name}
          countryAlpha2={pinSubmitCountry.code}
          onClose={() => setPinSubmitCountry(null)}
          onSuccess={() => {
            setPinSubmitCountry(null)
            // 즉시 핀 목록 갱신
            fetch('/api/pins?all=1')
              .then(r => r.json())
              .then((data: GlobePin[]) => { if (Array.isArray(data)) pinsRef.current = data })
              .catch(() => {})
          }}
        />
      )}

      {/* 홍보 핀 리스트 패널 */}
      {activePinPopup && (
        <PromoListPanel
          countryName={activePinPopup.countryName}
          pins={activePinPopup.pins}
          x={activePinPopup.x}
          y={activePinPopup.y}
          onClose={() => setActivePinPopup(null)}
          onAddPin={() => {
            setActivePinPopup(null)
            setPinSubmitCountry({ code: activePinPopup.alpha2, name: activePinPopup.countryName })
          }}
        />
      )}

      {/* AdminPanel — 랭킹 패널 왼쪽 */}
      <AdminPanel right={(commentCountry ? 324 : 16) + 240 + 8} />

      {/* 방문자 통계 링크 — AdminPanel 왼쪽 */}
      <Link
        href="/stats"
        style={{
          position: 'absolute',
          bottom: 80,
          right: (commentCountry ? 324 : 16) + 240 + 8 + 34 + 8,
          zIndex: 1000,
          padding: '6px 14px',
          borderRadius: 99,
          background: 'rgba(15,15,25,0.65)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#475569',
          fontSize: 12,
          fontWeight: 500,
          backdropFilter: 'blur(8px)',
          textDecoration: 'none',
          transition: 'right 0.35s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {t('visitorStats')}
      </Link>

      {/* 좌하단: 랜덤 스핀 버튼 + 범례 */}
      <div style={{ position: 'absolute', bottom: 32, left: 16, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
        {!pollMode && (
          <button
            onClick={handleRandomSpin}
            disabled={isSpinning}
            style={{
              ...glass,
              borderRadius: 12,
              padding: '8px 16px',
              border: `1px solid ${isSpinning ? 'rgba(255,255,255,0.07)' : 'rgba(167,139,250,0.35)'}`,
              color: isSpinning ? '#475569' : '#a78bfa',
              fontSize: 13,
              fontWeight: 600,
              cursor: isSpinning ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              background: isSpinning ? 'rgba(15,15,25,0.55)' : 'rgba(167,139,250,0.08)',
            }}
          >
            {isSpinning ? t('spinning') : t('randomSpin')}
          </button>
        )}
        <div style={{ ...glass, borderRadius: 12, padding: '10px 14px', display: pollMode ? 'none' : undefined }}>
          <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
            {t('clickTier')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {TIERS.map(t => (
              <div key={t.tag} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: t.color, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: '#94a3b8', minWidth: 72 }}>{t.label}</span>
                <span style={{ fontSize: 10, color: t.color, fontWeight: 600 }}>{t.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
