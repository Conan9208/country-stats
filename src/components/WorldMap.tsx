'use client'
/* eslint-disable react-hooks/preserve-manual-memoization */

import { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from 'react'
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
import { PinHoverTooltip } from '@/components/worldmap/PinHoverTooltip'
import { GuidePanel } from '@/components/worldmap/GuidePanel'
import { MobileTapBadge } from '@/components/worldmap/MobileTapBadge'
import { GlobeContextMenu } from '@/components/worldmap/GlobeContextMenu'
import { LoadingOverlay } from '@/components/worldmap/LoadingOverlay'
import { GlobeBottomControls } from '@/components/worldmap/GlobeBottomControls'
import { PromoteHintToast } from '@/components/worldmap/PromoteHintToast'
import { TierLegend } from '@/components/worldmap/TierLegend'
import type { ClickData, ClickEntry } from '@/types/map'
import type { PollQuestion } from '@/types/poll'
import { countryColor, countryColorQuiz, pollVoteColor, topN, topNToday, isVisibleOnGlobe, calcPinGrid } from '@/lib/mapUtils'
import { supabase } from '@/lib/supabase'
import { worldGeo, landGeo, bordersMesh, graticuleData, alpha2Map, featureByAlpha2, centroidByAlpha2, geoBBoxByAlpha2 } from '@/lib/geoData'
import { useRealtimeViewers } from '@/hooks/useRealtimeViewers'
import { useSpinRoulette } from '@/hooks/useSpinRoulette'
import PinSubmitModal from '@/components/PinSubmitModal'
import PromoListPanel from '@/components/PromoListPanel'
import QuizModal from '@/components/QuizModal'
import type { GlobePin } from '@/types/pin'
import { pinDisplayTitle } from '@/types/pin'
import { useLocale, useTranslations } from 'next-intl'

isoCountries.registerLocale(localeKo)
isoCountries.registerLocale(localeEn)
  

type WorldMapProps = {
  pollMode?: boolean
  onPollVote?: (alpha2: string, name: string) => void
  pollVotedCountry?: string | null
  pollData?: Record<string, number>
  pollQuestion?: PollQuestion | null
  pollTotalVotes?: number
  pollMyVote?: string | null
  onCancelPollVote?: () => void
  onStartPoll?: () => void
}

export default function WorldMap({ pollMode, onPollVote, pollVotedCountry, pollData, pollQuestion, pollTotalVotes, pollMyVote, onCancelPollVote, onStartPoll }: WorldMapProps = {}) {
  const locale = useLocale()
  const t = useTranslations('Map')
  const tQuiz = useTranslations('Quiz')
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => { setIsMobile(window.matchMedia('(pointer: coarse)').matches) }, [])

  // refs so draw() can read latest props without being a dependency
  const pollModeRef         = useRef(pollMode)
  const pollVotedCountryRef = useRef(pollVotedCountry)
  const pollDataRef         = useRef(pollData)
  useLayoutEffect(() => { pollModeRef.current = pollMode }, [pollMode])
  useEffect(() => { pollVotedCountryRef.current = pollVotedCountry }, [pollVotedCountry])
  useEffect(() => { pollDataRef.current = pollData }, [pollData])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDataReady, setIsDataReady] = useState(false)
  const [clickData, setClickData] = useState<ClickData>({})
  const clickDataRef = useRef<ClickData>({})
  // 클릭수 > 0 인 alpha2 코드만 모아두는 캐시 — draw() 핫패스에서 매 프레임 Object.keys() 순회 방지
  const clickedAlpha2sRef = useRef<Set<string>>(new Set())
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
  // 핀 그룹핑 캐시 — draw()/getPinsAtPoint() 에서 매 호출마다 Map 재생성 방지
  const pinsByCountryRef = useRef<Map<string, GlobePin[]>>(new Map())
  const pinImgCacheRef = useRef<Map<string, HTMLImageElement>>(new Map())
  const pinImgFailedRef = useRef<Set<string>>(new Set())
  // 핀 hover 툴팁 상태 (HTML overlay)
  const [pinHoverTooltip, setPinHoverTooltip] = useState<{ name: string; website?: string; x: number; y: number } | null>(null)
  const pinHoverTooltipRef = useRef<{ name: string; website?: string; x: number; y: number } | null>(null)
  // 핀 hover 중인지 (커서 변경용)
  const isOverPinRef = useRef(false)
  const [pinSubmitCountry, setPinSubmitCountry] = useState<{ code: string; name: string } | null>(null)
  const [activePinPopup, setActivePinPopup] = useState<{ alpha2: string; pins: GlobePin[]; countryName: string; x: number; y: number } | null>(null)
  // 딥링크 착륙: ?pin=<id> 로 들어오면 그 나라로 회전 + 핀 강조
  const [highlightPinId, setHighlightPinId] = useState<string | null>(null)
  const focusAnimRef = useRef<{ start: [number, number]; target: [number, number]; startTime: number; duration: number; alpha2: string; pinId: string } | null>(null)
  const onArriveRef = useRef<((alpha2: string, pinId: string) => void) | null>(null)
  const deepLinkDoneRef = useRef(false)
  // 퀴즈 모드
  const [quizMode, setQuizMode] = useState(false)
  const quizModeRef = useRef(false)
  const [quizCountry, setQuizCountry] = useState<{ code: string; name: string } | null>(null)
  // 홍보 모드 — 모드 진입 후 나라 클릭 시 핀 등록 모달 오픈 (퀴즈 모드와 동일 패턴)
  const [promoteMode, setPromoteMode] = useState(false)
  const promoteModeRef = useRef(false)
  // 홍보 모드 진입 시 5초간 뜨는 온보딩 안내 토스트
  const [showPromoteHint, setShowPromoteHint] = useState(false)
  // 글로우 커서 DOM 레이어 (네이티브 포인터를 따라가는 컴포지터 레이어)
  const glowRef = useRef<HTMLDivElement>(null)
  const glowOverCountryRef = useRef(false)
  // DPR(고해상도) 렌더링 — 백킹스토어는 device px, 좌표/그리기는 논리(CSS) px 유지
  const dprRef = useRef(1)
  const cssSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 })
  // 모달
  const [debtCountry, setDebtCountry]   = useState<{ code: string; name: string } | null>(null)
  const [infoCountry, setInfoCountry]   = useState<{ code: string; name: string } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 모바일 탭 배지
  const [tapBadge, setTapBadge] = useState<{ id: number; alpha2: string; name: string; count: number } | null>(null)
  const tapBadgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 터치 전용 ref — 마우스 ref와 분리
  const longPressTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFiredRef  = useRef(false)
  const touchDragActiveRef = useRef(false)
  const pinchStartDistRef  = useRef<number | null>(null)
  const pinchStartScaleRef = useRef<number>(0)
  const wasPinchingRef     = useRef(false)
  // 클라이언트 사이드 rate limit (서버와 동일: 1분에 10회)
  const clientClickTimestampsRef = useRef<number[]>([])
  const CLIENT_RATE_LIMIT = 10
  const CLIENT_RATE_WINDOW = 60_000
  // 내 클릭 기록 (localStorage)
  const myClicksRef = useRef<Set<string>>(new Set())
  const [myClickCount, setMyClickCount] = useState(0)
  const animFrameRef = useRef<number>(0)
  const globalDragCleanupRef = useRef<(() => void) | null>(null)
  // 마우스 히트 테스트 rAF throttle (250Hz 마우스 → 60fps로 제한)
  const pendingHitRef = useRef<{ x: number; y: number } | null>(null)
  const hitTestScheduledRef = useRef(false)
  // 자동 회전
  const autoRotateRef = useRef(true)
  const [isMobileUI, setIsMobileUI] = useState(false)
  const [showTierPopup, setShowTierPopup] = useState(false)

  useEffect(() => { quizModeRef.current = quizMode }, [quizMode])
  useEffect(() => { promoteModeRef.current = promoteMode }, [promoteMode])

  // 홍보 모드 진입할 때마다 안내 토스트를 5초간 노출 후 자동 제거 (CSS가 페이드 인·아웃 처리)
  useEffect(() => {
    if (!promoteMode) { setShowPromoteHint(false); return }
    setShowPromoteHint(true)
    const tmr = setTimeout(() => setShowPromoteHint(false), 5000)
    return () => clearTimeout(tmr)
  }, [promoteMode])

  // 모드 토글 — 퀴즈/홍보는 상호 배타 (한쪽 켜면 다른쪽 해제). ref로 현재값 읽어 중첩 setState 회피
  const togglePromoteMode = useCallback(() => {
    const next = !promoteModeRef.current
    setPromoteMode(next)
    if (next) { setQuizMode(false); setQuizCountry(null) }
  }, [])
  const toggleQuizMode = useCallback(() => {
    const next = !quizModeRef.current
    setQuizMode(next)
    if (next) setPromoteMode(false)
    else setQuizCountry(null)
  }, [])

  // 홍보 모드일 때 Esc로 모드 종료 — 단, 핀 등록 모달이 열려 있으면 모달부터 닫히도록 양보
  useEffect(() => {
    if (!promoteMode) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pinSubmitCountry) setPromoteMode(false)
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [promoteMode, pinSubmitCountry])

  const handleQuizTrigger = useCallback((country: { code: string; name: string }) => {
    setQuizCountry(country)
  }, [])

  const { isSpinning, setIsSpinning, landingMarkerRef, spinningRef, spinStartRef, spinTargetRef, spinProgressRef, spinJourneyRef, fireworkParticlesRef, handleRandomSpin } = useSpinRoulette({
    canvasRef, rotationRef, scaleRef, autoRotateRef, velocityRef, overlayRef,
    quizModeRef,
    onQuizTrigger: handleQuizTrigger,
  })
  const { viewersByCountryRef, lastBroadcastCountryRef, presenceChannelRef, mySessionId, channelSubscribedRef } = useRealtimeViewers()

  // 이펙트
  type Shockwave = { x: number; y: number; t: number }
  type Particle  = { x: number; y: number; vx: number; vy: number; t: number; size: number }
  type Flash     = { alpha2: string; t: number }
  const shockwavesRef = useRef<Shockwave[]>([])
  const particlesRef  = useRef<Particle[]>([])
  const flashesRef    = useRef<Flash[]>([])
  const mousePosRef   = useRef<{ x: number; y: number } | null>(null)
  // 그라디언트 캐시 — canvas 크기/줌이 바뀔 때만 재생성
  const gradientCacheRef = useRef<{
    key: string
    ocean: CanvasGradient
    shine: CanvasGradient
  } | null>(null)
  // 프로젝션 캐시 — rotation/scale/size가 바뀔 때만 재생성 (매 frame 신규 객체 생성 방지)
  const projCacheRef = useRef<{
    key: string
    proj: ReturnType<typeof geoOrthographic>
  } | null>(null)

  useEffect(() => {
    fetch('/api/clicks')
      .then(r => r.json())
      .then((data: ClickData) => {
        clickDataRef.current = data
        for (const [k, v] of Object.entries(data)) {
          confirmedCountRef.current[k] = v.total ?? 0
          if ((v.total ?? 0) > 0) clickedAlpha2sRef.current.add(k)
        }
        setClickData(data)
        setIsDataReady(true)
      })
  }, [])

  const rebuildPinsByCountry = useCallback((pins: GlobePin[]) => {
    const map = new Map<string, GlobePin[]>()
    for (const pin of pins) {
      const list = map.get(pin.country_alpha2) ?? []
      list.push(pin)
      map.set(pin.country_alpha2, list)
    }
    pinsByCountryRef.current = map
  }, [])

  // 지구본 핀 로드 (1분마다 갱신)
  useEffect(() => {
    const load = () =>
      fetch('/api/pins?all=1')
        .then(r => r.json())
        .then((data: GlobePin[]) => {
          if (Array.isArray(data)) {
            pinsRef.current = data
            rebuildPinsByCountry(data)
          }
        })
        .catch(() => {})
    load()
    const iv = setInterval(load, 60_000)
    return () => clearInterval(iv)
  }, [rebuildPinsByCountry])

  // 딥링크 착륙: 해당 나라로 부드럽게 회전 (draw 루프가 focusAnimRef를 보간)
  const flyToPin = useCallback((alpha2: string, pinId: string, fallbackPin?: GlobePin) => {
    const centroid = centroidByAlpha2.get(alpha2)
    if (!centroid) return

    // 로드된 목록에 없으면(만료/500개 초과) 단건 핀을 끼워넣어 팝업에서 보이게
    if (fallbackPin && !(pinsByCountryRef.current.get(alpha2) ?? []).some(p => p.id === fallbackPin.id)) {
      pinsRef.current = [fallbackPin, ...pinsRef.current]
      rebuildPinsByCountry(pinsRef.current)
    }

    autoRotateRef.current = false
    velocityRef.current = [0, 0]
    focusAnimRef.current = {
      start: [...rotationRef.current] as [number, number],
      target: [-centroid[0], Math.max(-75, Math.min(75, -centroid[1]))],
      startTime: performance.now(),
      duration: 1100,
      alpha2,
      pinId,
    }
  }, [rebuildPinsByCountry])

  // 착륙 완료 시(draw 루프에서 호출) 팝업 열고 핀 강조 — ref로 최신 클로저 유지
  useEffect(() => {
    onArriveRef.current = (alpha2, pinId) => {
      const pins = pinsByCountryRef.current.get(alpha2) ?? []
      const countryName = isoCountries.getName(alpha2.toUpperCase(), locale) ?? alpha2
      const cw = canvasRef.current?.clientWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 1200)
      const ch = canvasRef.current?.clientHeight ?? (typeof window !== 'undefined' ? window.innerHeight : 800)
      setHighlightPinId(pinId)
      setActivePinPopup({ alpha2, pins, countryName, x: Math.round(cw * 0.5), y: Math.round(ch * 0.42) })
    }
  }, [locale])

  // ?pin=<id> 감지 → 핀 찾아 착륙 (데이터 준비 후 1회)
  useEffect(() => {
    if (deepLinkDoneRef.current || !isDataReady) return
    const pinId = new URLSearchParams(window.location.search).get('pin')
    if (!pinId) { deepLinkDoneRef.current = true; return }
    deepLinkDoneRef.current = true
    ;(async () => {
      let pin: GlobePin | null = pinsRef.current.find(p => p.id === pinId) ?? null
      if (!pin) {
        try {
          const res = await fetch(`/api/pins/${pinId}`)
          if (res.ok) pin = await res.json()
        } catch { /* ignore */ }
      }
      if (pin) flyToPin(pin.country_alpha2, pin.id, pin)
    })()
  }, [isDataReady, flyToPin])

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

  // 캔버스 밖 클릭/터치 시 컨텍스트 메뉴 + 티어 팝업 닫기
  useEffect(() => {
    const handler = () => {
      if (contextMenuRef.current) closeContextMenu()
      setShowTierPopup(false)
    }
    window.addEventListener('mousedown', handler)
    window.addEventListener('touchstart', handler)
    return () => {
      window.removeEventListener('mousedown', handler)
      window.removeEventListener('touchstart', handler)
    }
  }, [closeContextMenu])

  // 모바일 여부 감지
  useEffect(() => {
    const check = () => setIsMobileUI(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Esc 키로 팝업/모달 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (contextMenuRef.current) { closeContextMenu(); return }
      setActivePinPopup(prev => { if (prev) return null; return prev })
      setHighlightPinId(null)
      setPinSubmitCountry(prev => { if (prev) return null; return prev })
      setInfoCountry(prev => { if (prev) return null; return prev })
      setCommentCountry(prev => { if (prev) return null; return prev })
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
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
          if (rtTotal > 0) clickedAlpha2sRef.current.add(row.country_code)
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
    // 논리(CSS) px 기준으로 프로젝션 구성 — 백킹스토어는 DPR로 확대되지만 좌표계는 CSS px 유지
    const { w, h } = cssSizeRef.current
    const cw = w || canvas.width
    const ch = h || canvas.height
    const size = Math.min(cw, ch)
    // 화면보다 훨씬 큰 지구본 → 가까이서 보는 거대한 지구 느낌
    const baseScale = size * 1.6
    const scale = baseScale * Math.pow(1.3, scaleRef.current)
    // 모바일(≤640px)에서는 지구본을 정중앙에, 데스크탑에서는 왼쪽으로 오프셋
    const isMobile = cw <= 640
    const translateX = isMobile ? cw / 2 : cw / 2 - 128
    // 프로젝션 캐시: rotation/scale/size/translate가 모두 같으면 기존 인스턴스 재사용
    const projKey = `${cw},${ch},${scale.toFixed(2)},${rotationRef.current[0].toFixed(4)},${rotationRef.current[1].toFixed(4)}`
    if (projCacheRef.current?.key === projKey) return projCacheRef.current.proj
    const proj = geoOrthographic()
      .scale(scale)
      .translate([translateX, ch / 2])
      .rotate([rotationRef.current[0], rotationRef.current[1], 0])
      .clipAngle(90)
    projCacheRef.current = { key: projKey, proj }
    return proj
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const proj = getProjection()
    if (!proj) return
    // DPR 변환: 백킹스토어는 device px(=논리 px × dpr)지만, 이 변환으로 모든 그리기를 논리 px로 다룸 → 선명 + 좌표 무변경
    const dpr = dprRef.current
    const { w: cw, h: ch } = cssSizeRef.current
    const W = cw || canvas.width
    const H = ch || canvas.height
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const path = geoPath(proj, ctx)

    ctx.clearRect(0, 0, W, H)

    // 바다 (구 배경)
    ctx.beginPath()
    path({ type: 'Sphere' } as unknown as Feature<Geometry, GeoJsonProperties>)
    const centerX = W / 2
    const centerY = H / 2
    const radius = proj.scale()

    // 그라디언트 캐시: 크기·줌이 바뀔 때만 재생성 (5px 단위로 반올림 → 줌 중 jitter 방지)
    const gKey = `${W},${H},${Math.round(radius / 5)}`
    if (!gradientCacheRef.current || gradientCacheRef.current.key !== gKey) {
      const ocean = ctx.createRadialGradient(
        centerX - radius * 0.2, centerY - radius * 0.25, radius * 0.05,
        centerX, centerY, radius * 1.1
      )
      ocean.addColorStop(0, '#1a6fa8')
      ocean.addColorStop(0.5, '#0d4f7a')
      ocean.addColorStop(1, '#062840')
      const shine = ctx.createRadialGradient(
        centerX - radius * 0.35, centerY - radius * 0.35, radius * 0.02,
        centerX - radius * 0.1, centerY - radius * 0.1, radius * 0.75
      )
      shine.addColorStop(0, 'rgba(255,255,255,0.12)')
      shine.addColorStop(0.4, 'rgba(255,255,255,0.03)')
      shine.addColorStop(1, 'rgba(0,0,0,0)')
      gradientCacheRef.current = { key: gKey, ocean, shine }
    }
    const gradient = gradientCacheRef.current.ocean
    ctx.fillStyle = gradient
    ctx.fill()

    // 위경도 격자선
    ctx.beginPath()
    path(graticuleData)
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 0.5
    ctx.stroke()

    // 육지 베이스
    const isQuiz = quizModeRef.current
    const isPromote = promoteModeRef.current
    ctx.beginPath()
    path(landGeo)
    ctx.fillStyle = isQuiz ? '#031a17' : isPromote ? '#33304a' : '#2a5a3a'
    ctx.fill()

    // 루프 밖에서 한 번만 계산 — 매 프레임 재계산 방지
    const isDragging   = dragStartRef.current !== null
    const isPoll       = pollModeRef.current
    const pData        = pollDataRef.current
    const maxPollVotes = (isPoll && pData && Object.keys(pData).length > 0)
      ? Math.max(...Object.values(pData))
      : 1

    // 호버·선택 상태를 로컬 변수에 캡처 (루프 내 ref 접근 최소화)
    const hoveredA2  = hoveredAlpha2Ref.current
    const selectedA2 = selectedAlpha2Ref.current
    const votedA2    = pollVotedCountryRef.current

    // 국가별 색상 — specialAlpha2s Set 생성 없이 인라인 조건으로 스킵 (매 프레임 O(n) 할당 제거)
    for (const feature of worldGeo.features) {
      const numericId = String((feature as Feature & { id?: string | number }).id ?? '')
      const alpha2 = alpha2Map.get(numericId) ?? null
      if (!alpha2) continue
      const isHoveredPre  = alpha2 === hoveredA2
      const isSelectedPre = alpha2 === selectedA2
      if (!isHoveredPre && !isSelectedPre) {
        if (isPoll) {
          if (alpha2 !== votedA2 && !pData?.[alpha2]) continue
        } else {
          if (!clickedAlpha2sRef.current.has(alpha2)) continue
        }
      }

      const count        = clickDataRef.current[alpha2]?.total ?? 0
      const isHovered    = alpha2 === hoveredAlpha2Ref.current
      const isSelected   = alpha2 === selectedAlpha2Ref.current
      const isMyPollVote = isPoll && alpha2 === pollVotedCountryRef.current

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
        ctx.fillStyle = isPoll ? 'rgba(167,139,250,0.45)' : isPromote ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.30)'
        ctx.fill()
        ctx.strokeStyle = isPoll ? 'rgba(167,139,250,0.85)' : isPromote ? 'rgba(251,191,36,0.9)' : 'rgba(255,255,255,0.75)'
        ctx.lineWidth = 1.2
        ctx.stroke()
      } else if (isPoll && pData?.[alpha2]) {
        ctx.fillStyle = pollVoteColor(pData[alpha2], maxPollVotes)
        ctx.globalAlpha = 0.75
        ctx.fill()
        ctx.globalAlpha = 1
      } else if (!isPoll && count > 0) {
        ctx.fillStyle = isQuiz ? countryColorQuiz(count) : countryColor(count)
        ctx.globalAlpha = 0.7
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }

    // 국경선
    ctx.beginPath()
    path(bordersMesh)
    ctx.strokeStyle = 'rgba(180,210,255,0.38)'
    ctx.lineWidth = 0.65
    ctx.stroke()

    // 구 테두리
    ctx.beginPath()
    path({ type: 'Sphere' } as unknown as Feature<Geometry, GeoJsonProperties>)
    ctx.strokeStyle = 'rgba(100,180,255,0.25)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // 구 광택 효과 (캐시된 그라디언트 재사용)
    ctx.beginPath()
    path({ type: 'Sphere' } as unknown as Feature<Geometry, GeoJsonProperties>)
    ctx.fillStyle = gradientCacheRef.current!.shine
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

    // (커서는 더 이상 캔버스에 그리지 않음 — 네이티브 포인터 + .globe-cursor-glow DOM 레이어가 담당)

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
      // 글로우 (드래그·스핀 중에는 생략, layered arc로 gradient 객체 생성 제거)
      if (!isDragging && !spinningRef.current) {
        ctx.beginPath()
        ctx.arc(px, py, dotR * 4, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(192,132,252,${(0.10 + pulse * 0.06).toFixed(2)})`
        ctx.fill()
        ctx.beginPath()
        ctx.arc(px, py, dotR * 2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(192,132,252,${(0.20 + pulse * 0.10).toFixed(2)})`
        ctx.fill()
      }
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
    // 줌 레벨에 따라 핀 크기 동적 조절 (나라 확대 비율과 동일하게 선형 스케일)
    const pinZoomFactor = Math.pow(1.3, scaleRef.current)
    const pinRadius = Math.max(7, Math.min(60, Math.round(13 * pinZoomFactor)))
    const pinDiameter = pinRadius * 2
    // 50% 겹침: 이웃 핀 중심간 거리 = pinRadius (직경의 절반)
    const pinSpacing = pinRadius

    // pinsByCountryRef는 fetch 시점(rebuildPinsByCountry)에만 갱신되는 캐시 — 매 프레임 Map 재생성 제거
    for (const [alpha2, pins] of pinsByCountryRef.current) {
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

      // 글로우 (드래그·스핀 중에는 생략, layered arc로 gradient 객체 생성 제거)
      if (!isDragging && !spinningRef.current) {
        ctx.beginPath()
        ctx.arc(px, py, pinDiameter, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(167,139,250,${(0.08 + pulse2 * 0.06).toFixed(2)})`
        ctx.fill()
        ctx.beginPath()
        ctx.arc(px, py, pinDiameter * 0.6, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(167,139,250,${(0.14 + pulse2 * 0.08).toFixed(2)})`
        ctx.fill()
      }

      // 나라 면적 기반 그리드 레이아웃 계산 (논리 px 기준 — getProjection과 동일 좌표계)
      const size = Math.min(W, H)
      const projScale = size * 1.6 * Math.pow(1.3, scaleRef.current)
      const DEG_TO_PX = projScale * Math.PI / 180

      const bbox = geoBBoxByAlpha2.get(alpha2)
      let cols = 1, rows = 1
      if (bbox) {
        const { west, south, east, north } = bbox
        const midLat = (south + north) / 2
        const lngSpan = east >= west ? east - west : east + 360 - west
        const screenW = lngSpan * DEG_TO_PX * Math.cos(midLat * Math.PI / 180)
        const screenH = (north - south) * DEG_TO_PX
        cols = Math.max(1, Math.floor(screenW / pinSpacing))
        rows = Math.max(1, Math.floor(screenH / pinSpacing))
      }

      const isSmallCountry = cols === 1 && rows === 1
      const maxPins = cols * rows

      // 표시 수 및 overflow 결정
      let shownCount: number, overflow: number
      if (isSmallCountry) {
        shownCount = Math.min(pins.length, 3)
        overflow = pins.length > 3 ? pins.length - 3 : 0
      } else if (pins.length <= maxPins) {
        shownCount = pins.length; overflow = 0
      } else {
        shownCount = maxPins - 1  // 마지막 칸을 +N 뱃지로
        overflow = pins.length - shownCount
      }

      // 그리드 시작 좌표 계산 (centroid 기준 중앙 정렬)
      const actualCols = isSmallCountry ? Math.max(1, shownCount) : Math.min(cols, Math.max(1, shownCount))
      const usedRows = Math.ceil(shownCount / actualCols)
      const gridStartX = px - ((actualCols - 1) * pinSpacing) / 2
      const gridStartY = py - ((usedRows - 1) * pinSpacing) / 2

      const shown = pins.slice(0, shownCount)
      for (let i = 0; i < shown.length; i++) {
        const pin = shown[i]
        const col = i % actualCols
        const row = Math.floor(i / actualCols)
        const ix = gridStartX + col * pinSpacing
        const iy = gridStartY + row * pinSpacing

        if (pin.logo_url && !pinImgFailedRef.current.has(pin.logo_url)) {
          let img = pinImgCacheRef.current.get(pin.logo_url)
          if (!img) {
            img = new window.Image()
            img.crossOrigin = 'anonymous'  // crossOrigin은 반드시 src 전에 설정
            img.src = pin.logo_url
            img.onerror = () => {
              pinImgCacheRef.current.delete(pin.logo_url!)
              pinImgFailedRef.current.add(pin.logo_url!)  // 영구 실패 등록 → 무한 재시도 방지
            }
            pinImgCacheRef.current.set(pin.logo_url, img)
          }
          if (img.complete && img.naturalWidth > 0) {
            ctx.save()
            ctx.beginPath()
            ctx.arc(ix, iy, pinRadius, 0, Math.PI * 2)
            ctx.clip()
            ctx.drawImage(img, ix - pinRadius, iy - pinRadius, pinDiameter, pinDiameter)
            ctx.restore()
            ctx.beginPath()
            ctx.arc(ix, iy, pinRadius, 0, Math.PI * 2)
            ctx.strokeStyle = 'rgba(255,255,255,0.75)'
            ctx.lineWidth = 1.5
            ctx.stroke()
          } else {
            // 로딩 중 fallback
            ctx.beginPath()
            ctx.arc(ix, iy, pinRadius, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(167,139,250,0.5)'
            ctx.fill()
            ctx.font = `${Math.round(pinRadius * 1.1)}px serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText('📌', ix, iy)
          }
        } else {
          // 로고 없음: 이니셜 원형
          ctx.beginPath()
          ctx.arc(ix, iy, pinRadius, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(167,139,250,0.8)'
          ctx.fill()
          ctx.beginPath()
          ctx.arc(ix, iy, pinRadius, 0, Math.PI * 2)
          ctx.strokeStyle = 'rgba(255,255,255,0.5)'
          ctx.lineWidth = 1.5
          ctx.stroke()
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          if (pin.kind === 'message') {
            // 메시지 핀: 이모지를 마커로
            ctx.font = `${Math.round(pinRadius * 1.15)}px serif`
            ctx.fillText(pin.emoji || '💬', ix, iy)
          } else {
            ctx.font = `bold ${Math.max(7, Math.round(pinRadius * 0.85))}px sans-serif`
            ctx.fillStyle = '#fff'
            ctx.fillText((pin.business_name?.charAt(0) || '?').toUpperCase(), ix, iy)
          }
        }
        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'
      }

      // overflow 있으면 "+N" 뱃지 (마지막 핀 오른쪽 상단)
      if (overflow > 0) {
        const lastIdx = shownCount - 1
        const lastCol = isSmallCountry ? shownCount - 1 : lastIdx % actualCols
        const lastRow = isSmallCountry ? 0 : Math.floor(lastIdx / actualCols)
        const bx = gridStartX + lastCol * pinSpacing + pinRadius + 5
        const by2 = gridStartY + lastRow * pinSpacing - pinRadius * 0.7
        const badgeR = Math.max(5, Math.round(pinRadius * 0.75))
        ctx.beginPath()
        ctx.arc(bx, by2, badgeR, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(250,204,21,0.9)'
        ctx.fill()
        ctx.font = `bold ${Math.max(6, badgeR - 1)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#1a1a1a'
        ctx.fillText(`+${overflow}`, bx, by2)
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
    const MIN_FRAME_MS = 1000 / 60 // 60fps 상한선 (144Hz 모니터 대응)
    let last = performance.now()
    const loop = (now: number) => {
      const dt = now - last
      // 프레임 간격이 목표치보다 짧으면 스킵 (draw 비용 절감)
      if (dt < MIN_FRAME_MS) {
        animFrameRef.current = requestAnimationFrame(loop)
        return
      }
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
      } else if (focusAnimRef.current) {
        // 딥링크 착륙 회전 (ease-out cubic). 사용자가 잡으면 즉시 취소.
        const fa = focusAnimRef.current
        if (dragStartRef.current) {
          focusAnimRef.current = null
        } else {
          const p = Math.min(1, (now - fa.startTime) / fa.duration)
          const eased = 1 - Math.pow(1 - p, 3)
          const dLng = ((fa.target[0] - fa.start[0]) % 360 + 540) % 360 - 180  // 최단 경로
          rotationRef.current = [
            fa.start[0] + dLng * eased,
            fa.start[1] + (fa.target[1] - fa.start[1]) * eased,
          ]
          if (p >= 1) {
            landingMarkerRef.current = { alpha2: fa.alpha2, startTime: performance.now() }
            onArriveRef.current?.(fa.alpha2, fa.pinId)
            focusAnimRef.current = null
          }
        }
      } else if (!dragStartRef.current || !hasDraggedRef.current) {
        // drag 누름 but 아직 이동 없음 → 자동회전/관성 유지, dragStart.rotation도 같이 따라옴
        const [vx, vy] = velocityRef.current
        if (Math.abs(vx) > 0.0001 || Math.abs(vy) > 0.0001) {
          rotationRef.current = [
            rotationRef.current[0] + vx * dt,
            Math.max(-90, Math.min(90, rotationRef.current[1] - vy * dt)),
          ]
          velocityRef.current = [vx * 0.88, vy * 0.88]
          if (dragStartRef.current) dragStartRef.current.rotation = [...rotationRef.current] as [number, number]
        } else if (autoRotateRef.current && !contextMenuRef.current) {
          rotationRef.current = [rotationRef.current[0] + dt * 0.00133, rotationRef.current[1]]
          velocityRef.current = [0, 0]
          if (dragStartRef.current) dragStartRef.current.rotation = [...rotationRef.current] as [number, number]
        }
      }
      draw()
      animFrameRef.current = requestAnimationFrame(loop)
    }
    animFrameRef.current = requestAnimationFrame(loop)

    const onVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animFrameRef.current)
      } else {
        last = performance.now() // dt 스파이크 방지
        animFrameRef.current = requestAnimationFrame(loop)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [draw, spinJourneyRef, spinProgressRef, spinStartRef, spinTargetRef, spinningRef])

  // 캔버스 크기 맞추기
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return
      const cw = container.clientWidth
      const ch = container.clientHeight
      // DPR 캡 2 — 4K에서 백킹스토어가 폭주(×4 면적)하지 않게. 선명도/성능 균형점.
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      dprRef.current = dpr
      cssSizeRef.current = { w: cw, h: ch }
      canvas.width = Math.round(cw * dpr)
      canvas.height = Math.round(ch * dpr)
      // 캐시 무효화 — 다음 draw에서 프로젝션/그라디언트 재생성
      projCacheRef.current = null
      gradientCacheRef.current = null
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // 마우스 위치 → 나라 찾기
  const getAlpha2AtPoint = useCallback((x: number, y: number) => {
    const proj = getProjection()
    if (!proj) return null
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    // ⚠️ isPointInPath는 "경로"에는 CTM을 적용하지만 "점"에는 적용하지 않는다.
    // 따라서 DPR 변환을 걸면 경로만 device px(×dpr)로 저장되고 점(CSS px)과 어긋난다(원점에서 멀수록 더 벌어짐).
    // → 히트테스트는 항등 변환으로 경로를 논리(CSS) px에 그려두고, CSS px 점을 그대로 비교한다. (proj도 논리 px 기준)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    const pathInCtx = geoPath(proj, ctx)
    const features = worldGeo.features
    // 가시 반구 pre-filter: dot product ≤ 0인 피처는 isPointInPath 없이 스킵 (~50% 절감)
    const cLng = -rotationRef.current[0] * Math.PI / 180
    const cLat = -rotationRef.current[1] * Math.PI / 180
    for (let i = features.length - 1; i >= 0; i--) {
      const feature = features[i]
      const numericId = String((feature as Feature & { id?: string | number }).id ?? '')
      const alpha2 = alpha2Map.get(numericId) ?? null
      if (!alpha2) continue
      const geo = centroidByAlpha2.get(alpha2)
      if (geo) {
        const pLng = geo[0] * Math.PI / 180
        const pLat = geo[1] * Math.PI / 180
        const dot = Math.cos(pLat) * Math.cos(cLat) * Math.cos(pLng - cLng)
                  + Math.sin(pLat) * Math.sin(cLat)
        if (dot <= 0) continue
      }
      ctx.beginPath()
      pathInCtx(feature)
      if (ctx.isPointInPath(x, y)) {
        return { alpha2, numericId, feature }
      }
    }
    return null
  }, [getProjection])

  const hasDraggedRef = useRef(false)

  // 핀 히트 테스트 — 클릭/hover 좌표 근처에 핀이 있는 나라의 모든 핀 반환
  const getPinsAtPoint = useCallback((cx: number, cy: number): { alpha2: string; pins: GlobePin[]; countryName: string } | null => {
    const proj = getProjection()
    if (!proj) return null
    const cLng = -rotationRef.current[0] * Math.PI / 180
    const cLat = -rotationRef.current[1] * Math.PI / 180

    for (const [alpha2, pins] of pinsByCountryRef.current) {
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

      // draw loop와 동일한 pinRadius 및 그리드 계산 — 반드시 동기화 유지
      const hitZoom = Math.pow(1.3, scaleRef.current)
      const hitRadius = Math.max(7, Math.min(60, Math.round(13 * hitZoom)))
      const hitSpacing = hitRadius

      const hitSize = Math.min(cssSizeRef.current.w, cssSizeRef.current.h)
      const hitProjScale = hitSize * 1.6 * Math.pow(1.3, scaleRef.current)
      const hitDEG_TO_PX = hitProjScale * Math.PI / 180

      const hitBbox = geoBBoxByAlpha2.get(alpha2)
      let hitCols = 1, hitRows = 1
      if (hitBbox) {
        const { west, south, east, north } = hitBbox
        const midLat = (south + north) / 2
        const lngSpan = east >= west ? east - west : east + 360 - west
        const screenW = lngSpan * hitDEG_TO_PX * Math.cos(midLat * Math.PI / 180)
        const screenH = (north - south) * hitDEG_TO_PX
        hitCols = Math.max(1, Math.floor(screenW / hitSpacing))
        hitRows = Math.max(1, Math.floor(screenH / hitSpacing))
      }

      const hitIsSmall = hitCols === 1 && hitRows === 1
      const hitMaxPins = hitCols * hitRows
      let hitShownCount: number
      if (hitIsSmall) {
        hitShownCount = Math.min(pins.length, 3)
      } else if (pins.length <= hitMaxPins) {
        hitShownCount = pins.length
      } else {
        hitShownCount = hitMaxPins - 1
      }

      const hitActualCols = hitIsSmall ? Math.max(1, hitShownCount) : Math.min(hitCols, Math.max(1, hitShownCount))
      const hitUsedRows = Math.ceil(hitShownCount / hitActualCols)
      const hitGridStartX = px - ((hitActualCols - 1) * hitSpacing) / 2
      const hitGridStartY = py - ((hitUsedRows - 1) * hitSpacing) / 2

      for (let i = 0; i < hitShownCount; i++) {
        const col = i % hitActualCols
        const row = Math.floor(i / hitActualCols)
        const ix = hitGridStartX + col * hitSpacing
        const iy = hitGridStartY + row * hitSpacing
        const dist = Math.sqrt((cx - ix) ** 2 + (cy - iy) ** 2)
        if (dist <= hitRadius + 7) {
          const countryName = isoCountries.getName(alpha2, locale) ?? alpha2
          return { alpha2, pins, countryName }
        }
      }
    }
    return null
  }, [getProjection, locale])

  // 드래그
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // eslint-disable-next-line react-hooks/immutability
    hasDraggedRef.current = false   // spin 여부와 무관하게 항상 초기화
    if (spinningRef.current) return
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      rotation: [...rotationRef.current] as [number, number],
    }

    // 캔버스 밖으로 커서가 나가도 드래그 유지 (mouseleave 끊김 방지)
    const handleWindowMove = (ev: MouseEvent) => {
      if (!dragStartRef.current) return
      const canvas = canvasRef.current
      if (!canvas) return
      const dx = ev.clientX - dragStartRef.current.x
      const dy = ev.clientY - dragStartRef.current.y
      const proj = getProjection()
      const sensitivity = proj ? (180 / Math.PI) / proj.scale() : 0.05
      rotationRef.current = [
        dragStartRef.current.rotation[0] + dx * sensitivity,
        Math.max(-90, Math.min(90, dragStartRef.current.rotation[1] - dy * sensitivity)),
      ]
      const now = performance.now()
      const last = lastMouseRef.current
      if (last) {
        const dt = Math.max(1, now - last.t)
        velocityRef.current = [
          (ev.clientX - last.x) / dt * sensitivity,
          (ev.clientY - last.y) / dt * sensitivity,
        ]
      }
      lastMouseRef.current = { x: ev.clientX, y: ev.clientY, t: now }
      if (Math.sqrt(dx * dx + dy * dy) > 6) {
        hasDraggedRef.current = true
        autoRotateRef.current = false  // 실제 이동 시작 시점에 자동회전 중단
        hoveredAlpha2Ref.current = null
        overlayRef.current?.setTooltip(null)
      }
      const rect = canvas.getBoundingClientRect()
      const gx = ev.clientX - rect.left
      const gy = ev.clientY - rect.top
      mousePosRef.current = { x: gx, y: gy }
      const glow = glowRef.current
      if (glow) glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`
    }

    const handleWindowUp = (ev?: MouseEvent) => {
      dragStartRef.current = null
      lastMouseRef.current = null
      // 캔버스 밖에서 드래그를 놓으면 글로우가 멈춘 채 남으므로 숨김
      if (ev) {
        const c = canvasRef.current
        const r = c?.getBoundingClientRect()
        const outside = !r || ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom
        if (outside && glowRef.current) glowRef.current.style.display = 'none'
      }
      window.removeEventListener('mousemove', handleWindowMove)
      window.removeEventListener('mouseup', handleWindowUp)
      globalDragCleanupRef.current = null
    }

    globalDragCleanupRef.current = handleWindowUp
    window.addEventListener('mousemove', handleWindowMove)
    window.addEventListener('mouseup', handleWindowUp)
  }, [spinningRef, getProjection])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // 커서 렌더링용으로는 즉시 업데이트
    mousePosRef.current = { x, y }

    // 글로우 DOM 레이어를 포인터 위치로 (compositor transform — 캔버스 리드로우와 무관)
    const glow = glowRef.current
    if (glow) {
      if (glow.style.display !== 'block') glow.style.display = 'block'
      glow.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }

    // 드래그 중이면 window 레벨 리스너가 처리 — 여기서는 건너뜀
    if (dragStartRef.current) return

    // 히트 테스트를 rAF로 throttle — 마우스는 250Hz로 쏘지만 화면은 60fps
    pendingHitRef.current = { x, y }
    if (!hitTestScheduledRef.current) {
      hitTestScheduledRef.current = true
      requestAnimationFrame(() => {
        hitTestScheduledRef.current = false
        // 드래그·스핀 중이면 건너뜀
        if (dragStartRef.current || spinningRef.current) return
        const pos = pendingHitRef.current
        if (!pos) return
        const { x: hx, y: hy } = pos

        // 핀 hover 감지 (나라 hover보다 우선 — 클릭 동작과 일치)
        const pinHit = getPinsAtPoint(hx, hy)
        if (pinHit) {
          isOverPinRef.current = true
          const topPin = pinHit.pins[0]
          const newTooltip = { name: pinDisplayTitle(topPin), website: topPin.website_url ?? undefined, x: hx, y: hy }
          if (
            pinHoverTooltipRef.current?.name !== newTooltip.name ||
            Math.abs((pinHoverTooltipRef.current?.x ?? 0) - hx) > 4 ||
            Math.abs((pinHoverTooltipRef.current?.y ?? 0) - hy) > 4
          ) {
            pinHoverTooltipRef.current = newTooltip
            setPinHoverTooltip(newTooltip)
          }
          overlayRef.current?.setTooltip(null)
          return
        }
        if (isOverPinRef.current) {
          isOverPinRef.current = false
          pinHoverTooltipRef.current = null
          setPinHoverTooltip(null)
        }

        // 나라 hover 감지
        const hit = getAlpha2AtPoint(hx, hy)
        if (hit?.alpha2) {
          // confirmedCountRef: 서버 확정값만 — 낙관적 값 절대 안 들어옴
          const count = confirmedCountRef.current[hit.alpha2] ?? 0
          const name = isoCountries.getName(hit.alpha2.toUpperCase(), locale)
            ?? clickDataRef.current[hit.alpha2]?.name
            ?? hit.alpha2
          hoveredAlpha2Ref.current = hit.alpha2
          hoveredNameRef.current   = name
          if (!glowOverCountryRef.current) {
            glowOverCountryRef.current = true
            glowRef.current?.classList.add('over-country')
          }
          overlayRef.current?.setTooltip({ name, count, x: hx, y: hy, alpha2: hit.alpha2, viewers: viewersByCountryRef.current[hit.alpha2] ?? 0 })
          // 뷰어 broadcast — 나라가 바뀔 때만 전송
          if (hit.alpha2 !== lastBroadcastCountryRef.current) {
            lastBroadcastCountryRef.current = hit.alpha2
            if (channelSubscribedRef.current) {
              presenceChannelRef.current?.send({
                type: 'broadcast', event: 'hover',
                payload: { sessionId: mySessionId.current, countryCode: hit.alpha2, ts: Date.now() },
              })
            }
          }
        } else {
          hoveredAlpha2Ref.current = null
          hoveredNameRef.current   = null
          if (glowOverCountryRef.current) {
            glowOverCountryRef.current = false
            glowRef.current?.classList.remove('over-country')
          }
          overlayRef.current?.setTooltip(null)
          if (lastBroadcastCountryRef.current !== null) {
            lastBroadcastCountryRef.current = null
            if (channelSubscribedRef.current) {
              presenceChannelRef.current?.send({
                type: 'broadcast', event: 'hover',
                payload: { sessionId: mySessionId.current, countryCode: null, ts: Date.now() },
              })
            }
          }
        }
      })
    }
  }, [getAlpha2AtPoint, getPinsAtPoint, getProjection, lastBroadcastCountryRef, mySessionId, presenceChannelRef, viewersByCountryRef, locale])

  const onMouseUp = useCallback(() => {
    globalDragCleanupRef.current?.()
  }, [])

  const onMouseLeave = useCallback(() => {
    // dragStartRef는 여기서 건드리지 않음 — window 리스너가 캔버스 밖 드래그를 담당
    mousePosRef.current = null
    pendingHitRef.current = null  // 대기 중인 히트 테스트 취소
    hoveredAlpha2Ref.current = null
    // 글로우 숨김 — 단, 캔버스 밖 드래그 중이면 유지(window 리스너가 계속 따라감)
    if (!dragStartRef.current && glowRef.current) glowRef.current.style.display = 'none'
    glowOverCountryRef.current = false
    glowRef.current?.classList.remove('over-country')
    overlayRef.current?.setTooltip(null)
    isOverPinRef.current = false
    pinHoverTooltipRef.current = null
    setPinHoverTooltip(null)
    if (!dragStartRef.current) autoRotateRef.current = true
    if (lastBroadcastCountryRef.current !== null) {
      lastBroadcastCountryRef.current = null
      if (channelSubscribedRef.current) {
        presenceChannelRef.current?.send({
          type: 'broadcast', event: 'hover',
          payload: { sessionId: mySessionId.current, countryCode: null, ts: Date.now() },
        })
      }
    }
  }, [channelSubscribedRef, lastBroadcastCountryRef, mySessionId, presenceChannelRef])

  const onPollVoteRef = useRef(onPollVote)
  useEffect(() => { onPollVoteRef.current = onPollVote }, [onPollVote])

  const onClick = useCallback(async (e: React.MouseEvent) => {
    if (contextMenuRef.current) { closeContextMenu(); return }
    if (hasDraggedRef.current) return

    // 홍보 모드: 어떤 나라든(이미 핀이 있어도) 클릭 시 곧장 등록 모달.
    // 핀 팝업보다 먼저 가로채고, 나라 우선 → 핀이 올라간 나라 순으로 좌표 해석. 모드는 유지(잘못 클릭해도 재선택 가능)
    if (promoteModeRef.current) {
      const c = canvasRef.current
      if (c) {
        const rect = c.getBoundingClientRect()
        const cx = e.clientX - rect.left
        const cy = e.clientY - rect.top
        const cHit = getAlpha2AtPoint(cx, cy)
        if (cHit?.alpha2) {
          const cName = isoCountries.getName(cHit.alpha2.toUpperCase(), locale) ?? cHit.alpha2
          setPinSubmitCountry({ code: cHit.alpha2, name: cName })
          return
        }
        const pHit = getPinsAtPoint(cx, cy)
        if (pHit) { setPinSubmitCountry({ code: pHit.alpha2, name: pHit.countryName }); return }
      }
      return // 빈 바다 클릭 → 무시 (모드 유지)
    }

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

    // 투표 모드
    if (pollModeRef.current) {
      onPollVoteRef.current?.(alpha2, name)
      return
    }

    // 퀴즈 모드: 나라 클릭 시 수도 퀴즈 표시
    if (quizModeRef.current) {
      setQuizCountry({ code: alpha2, name })
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

    // 클라이언트 사이드 rate limit 체크 (낙관적 업데이트 전에 먼저 차단)
    const nowMs = Date.now()
    clientClickTimestampsRef.current = clientClickTimestampsRef.current.filter(
      ts => nowMs - ts < CLIENT_RATE_WINDOW
    )
    if (clientClickTimestampsRef.current.length >= CLIENT_RATE_LIMIT) {
      // 😤 float 즉시 표시 (API 호출 없음, 낙관적 업데이트도 없음)
      const floatId = Date.now() + Math.random()
      overlayRef.current?.addFloatNum(floatId, fx, fy, 1)
      overlayRef.current?.rateLimitFloatNum(floatId)
      setTimeout(() => overlayRef.current?.removeFloatNum(floatId), 1400)
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      overlayRef.current?.setToast({ message: t('toastRateLimitTitle'), sub: t('toastRateLimitSub') })
      toastTimerRef.current = setTimeout(() => overlayRef.current?.setToast(null), 3000)
      return
    }
    clientClickTimestampsRef.current.push(nowMs)

    // 낙관적 업데이트: 지구본 색상만 즉시 반영 (confirmedCountRef/tooltip은 건드리지 않음)
    const prevTotal = clickDataRef.current[alpha2]?.total ?? 0
    const prevAllTimeRank = topN(clickDataRef.current, locale, 20).findIndex(e => e.alpha2 === alpha2)
    const prevTodayRank = topNToday(clickDataRef.current, locale, 20).findIndex(e => e.alpha2 === alpha2)
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

    // 순위 변경 float (클릭 후 순위 상승 시 마우스 근처에 표시)
    const newAllTimeRank = topN(clickDataRef.current, locale, 20).findIndex(e => e.alpha2 === alpha2)
    const newTodayRank = topNToday(clickDataRef.current, locale, 20).findIndex(e => e.alpha2 === alpha2)

    const allTimeDelta: number | 'NEW' | null =
      prevAllTimeRank === -1
        ? (newAllTimeRank !== -1 ? 'NEW' : null)
        : (newAllTimeRank !== -1 && prevAllTimeRank > newAllTimeRank ? prevAllTimeRank - newAllTimeRank : null)
    const todayDelta: number | 'NEW' | null =
      prevTodayRank === -1
        ? (newTodayRank !== -1 ? 'NEW' : null)
        : (newTodayRank !== -1 && prevTodayRank > newTodayRank ? prevTodayRank - newTodayRank : null)

    if (todayDelta !== null) {
      const rank = newTodayRank + 1
      const text = todayDelta === 'NEW' ? `📅 #${rank}` : `📅 #${rank} +${todayDelta}`
      const rid = Date.now() + Math.random() + 0.2
      overlayRef.current?.addRankFloat(rid, fx, fy + 18, text, 'today', rank)
      setTimeout(() => overlayRef.current?.removeRankFloat(rid), 1200)
    }
    if (allTimeDelta !== null) {
      const rank = newAllTimeRank + 1
      const text = allTimeDelta === 'NEW' ? `🏆 #${rank}` : `🏆 #${rank} +${allTimeDelta}`
      const rid = Date.now() + Math.random() + 0.3
      overlayRef.current?.addRankFloat(rid, fx + 28, fy + 18, text, 'alltime', rank)
      setTimeout(() => overlayRef.current?.removeRankFloat(rid), 1200)
    }

    // 내 클릭 기록 저장
    if (!myClicksRef.current.has(alpha2)) {
      myClicksRef.current.add(alpha2)
      setMyClickCount(myClicksRef.current.size)
      try { localStorage.setItem('my_clicked_countries', JSON.stringify([...myClicksRef.current])) } catch { /* ignore */ }
    }
  }, [closeContextMenu, t, locale, getAlpha2AtPoint, getPinsAtPoint])

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

  // 터치 이벤트 — 마우스 핸들러와 완전 분리, 기존 JSX 마우스 props 미수정
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      if (spinningRef.current) return
      longPressFiredRef.current = false
      touchDragActiveRef.current = false

      if (e.touches.length === 1) {
        const touch = e.touches[0]
        hasDraggedRef.current = false
        dragStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          rotation: [...rotationRef.current] as [number, number],
        }
        // 롱프레스 500ms → 컨텍스트 메뉴 (우클릭 대체)
        longPressTimerRef.current = setTimeout(() => {
          if (!hasDraggedRef.current) {
            longPressFiredRef.current = true
            const rect = canvas.getBoundingClientRect()
            const cx = touch.clientX - rect.left
            const cy = touch.clientY - rect.top
            let alpha2 = hoveredAlpha2Ref.current
            let name   = hoveredNameRef.current
            if (!alpha2) {
              const hit = getAlpha2AtPoint(cx, cy)
              if (hit?.alpha2) {
                alpha2 = hit.alpha2
                name = isoCountries.getName(hit.alpha2.toUpperCase(), locale) ?? hit.alpha2
              }
            }
            if (alpha2 && name) {
              selectedAlpha2Ref.current = alpha2
              const menu = { x: touch.clientX, y: touch.clientY, alpha2, name }
              contextMenuRef.current = menu
              setContextMenu(menu)
            }
          }
        }, 500)
      } else if (e.touches.length === 2) {
        clearTimeout(longPressTimerRef.current!)
        dragStartRef.current = null
        hasDraggedRef.current = true
        wasPinchingRef.current = true
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        pinchStartDistRef.current = Math.sqrt(dx * dx + dy * dy)
        pinchStartScaleRef.current = scaleRef.current
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      if (spinningRef.current) return

      if (e.touches.length === 1 && dragStartRef.current) {
        const touch = e.touches[0]
        const dx = touch.clientX - dragStartRef.current.x
        const dy = touch.clientY - dragStartRef.current.y
        if (Math.sqrt(dx * dx + dy * dy) > 6) {
          touchDragActiveRef.current = true
          hasDraggedRef.current = true
          autoRotateRef.current = false  // 실제 이동 시작 시점에 자동회전 중단
          clearTimeout(longPressTimerRef.current!)
          hoveredAlpha2Ref.current = null
          overlayRef.current?.setTooltip(null)
        }
        const proj = getProjection()
        const sensitivity = proj ? (180 / Math.PI) / proj.scale() : 0.05
        rotationRef.current = [
          dragStartRef.current.rotation[0] + dx * sensitivity,
          Math.max(-90, Math.min(90, dragStartRef.current.rotation[1] - dy * sensitivity)),
        ]
        const now = performance.now()
        const last = lastMouseRef.current
        if (last) {
          const dt = Math.max(1, now - last.t)
          velocityRef.current = [
            (touch.clientX - last.x) / dt * sensitivity,
            (touch.clientY - last.y) / dt * sensitivity,
          ]
        }
        lastMouseRef.current = { x: touch.clientX, y: touch.clientY, t: now }
      } else if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
        clearTimeout(longPressTimerRef.current!)
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const ratio = dist / pinchStartDistRef.current
        scaleRef.current = Math.max(-3, Math.min(7,
          pinchStartScaleRef.current + Math.log(ratio) / Math.log(1.3)
        ))
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault()
      clearTimeout(longPressTimerRef.current!)
      pinchStartDistRef.current = null
      dragStartRef.current = null

      // 탭 처리: 드래그도 롱프레스도 핀치줌도 아닌 순수 탭
      if (!hasDraggedRef.current && !longPressFiredRef.current && !wasPinchingRef.current && e.changedTouches.length === 1) {
        const touch = e.changedTouches[0]
        const rect = canvas.getBoundingClientRect()
        const cx = touch.clientX - rect.left
        const cy = touch.clientY - rect.top

        const pinHit = getPinsAtPoint(cx, cy)
        if (pinHit) {
          setActivePinPopup({ alpha2: pinHit.alpha2, pins: pinHit.pins, countryName: pinHit.countryName, x: touch.clientX, y: touch.clientY })
        } else {
          const hit = getAlpha2AtPoint(cx, cy)
          if (hit?.alpha2) {
            hoveredAlpha2Ref.current = hit.alpha2
            const countryName = isoCountries.getName(hit.alpha2.toUpperCase(), locale) ?? hit.alpha2
            hoveredNameRef.current = countryName
            // 탭 정보 배지 표시 (국기 + 국가명 + 클릭수, 2초 후 자동 사라짐)
            const currentCount = confirmedCountRef.current[hit.alpha2] ?? clickDataRef.current[hit.alpha2]?.total ?? 0
            if (tapBadgeTimerRef.current) clearTimeout(tapBadgeTimerRef.current)
            setTapBadge({ id: Date.now(), alpha2: hit.alpha2, name: countryName, count: currentCount })
            tapBadgeTimerRef.current = setTimeout(() => setTapBadge(null), 2000)
            onClick({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} } as React.MouseEvent)
          }
        }
      }
      hasDraggedRef.current = false
      longPressFiredRef.current = false
      touchDragActiveRef.current = false
      if (e.touches.length === 0) wasPinchingRef.current = false
    }

    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false })
    canvas.addEventListener('touchend',   onTouchEnd,   { passive: false })
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove',  onTouchMove)
      canvas.removeEventListener('touchend',   onTouchEnd)
    }
  }, [getAlpha2AtPoint, getProjection, getPinsAtPoint, locale, onClick, setTapBadge, spinningRef])

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

  const handleMenuSelect = useCallback((action: 'info' | 'debt' | 'comment' | 'promote' | 'travel', alpha2: string, name: string) => {
    closeContextMenu()
    if (action === 'info')     setInfoCountry({ code: alpha2, name })
    if (action === 'debt')     setDebtCountry({ code: alpha2, name })
    if (action === 'comment')  setCommentCountry({ code: alpha2, name })
    if (action === 'promote')  setPinSubmitCountry({ code: alpha2, name })
    if (action === 'travel') {
      const defaultTo = alpha2 === 'US' ? 'JP' : 'US'
      window.open(`/${locale}/travel/${alpha2}/${defaultTo}`, '_blank')
    }
  }, [closeContextMenu, locale])

  const allTimeTop = useMemo(() => topN(clickData, locale), [clickData, locale])
  const todayTop = useMemo(() => topNToday(clickData, locale), [clickData, locale])
  const totalClicks = useMemo(() => Object.values(clickData).reduce((s, e) => s + (Number(e.total) || 0), 0), [clickData])

  return (
    <div ref={containerRef} style={{ position: 'relative', height: '100%', width: '100%', background: '#050a10', overflow: 'hidden', WebkitTouchCallout: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <StarField />
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', cursor: isMobile ? 'default' : 'none', position: 'relative', zIndex: 1, background: 'transparent', WebkitTouchCallout: 'none', userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'none' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        onContextMenu={onContextMenu}
      />

      {/* 글로우 커서 레이어 — 데스크탑 전용 (터치 기기는 렌더 안 함) */}
      {!isMobile && <div ref={glowRef} className="globe-cursor-glow" aria-hidden="true" />}

      <WorldMapOverlay ref={overlayRef} onSpinClose={() => setIsSpinning(false)} />

      {pinHoverTooltip && <PinHoverTooltip tooltip={pinHoverTooltip} detailsLabel={t('clickToSeeDetails')} />}

      <GuidePanel pollMode={pollMode} promoteMode={promoteMode} isMobile={isMobile} t={t} />

      {showPromoteHint && (
        <PromoteHintToast isMobileUI={isMobileUI} title={t('promoteHintTitle')} body={t('promoteHintBody')} />
      )}

      {tapBadge && <MobileTapBadge badge={tapBadge} />}

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
        pollMode={pollMode}
      />

      {contextMenu && (
        <GlobeContextMenu
          menu={contextMenu}
          onSelect={handleMenuSelect}
          labels={{
            info: t('contextInfo'),
            comment: t('contextComment'),
            promote: t('contextPin'),
            travel: t('contextTravel'),
          }}
        />
      )}

      {/* 모달 */}
      {debtCountry && <DebtModal code={debtCountry.code} name={debtCountry.name} onClose={() => setDebtCountry(null)} />}
      {infoCountry && <CountryInfoModal code={infoCountry.code} name={infoCountry.name} onClose={() => setInfoCountry(null)} />}
      {quizCountry && (
        <QuizModal
          countryCode={quizCountry.code}
          countryName={quizCountry.name}
          onClose={() => setQuizCountry(null)}
          onNext={quizMode ? () => { setQuizCountry(null); handleRandomSpin() } : undefined}
        />
      )}

      {/* 핀 등록 모달 */}
      {pinSubmitCountry && (
        <PinSubmitModal
          countryName={pinSubmitCountry.name}
          countryAlpha2={pinSubmitCountry.code}
          onClose={() => setPinSubmitCountry(null)}
          onSuccess={(_shareText, newPin) => {
            // POST 응답으로 받은 핀을 캐시 우회하여 즉시 반영.
            // draw()/getPinsAtPoint()는 pinsByCountryRef(그룹 캐시)를 읽으므로 반드시 재생성해야 바로 보임
            pinsRef.current = [newPin, ...pinsRef.current]
            rebuildPinsByCountry(pinsRef.current)
            setPinSubmitCountry(null)
          }}
        />
      )}

      {/* 홍보 핀 리스트 패널 — 백드롭: 외부 클릭 시 팝업 닫기 + 지구본 클릭 차단 */}
      {activePinPopup && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 2499 }}
          onClick={e => { e.stopPropagation(); setActivePinPopup(null); setHighlightPinId(null) }}
        />
      )}
      {activePinPopup && (
        <PromoListPanel
          countryName={activePinPopup.countryName}
          pins={activePinPopup.pins}
          x={activePinPopup.x}
          y={activePinPopup.y}
          highlightId={highlightPinId}
          onClose={() => { setActivePinPopup(null); setHighlightPinId(null) }}
          onAddPin={() => {
            setActivePinPopup(null)
            setHighlightPinId(null)
            setPinSubmitCountry({ code: activePinPopup.alpha2, name: activePinPopup.countryName })
          }}
        />
      )}

      <LoadingOverlay isReady={isDataReady} message={t('loadingGlobe')} />

      {!pollMode && (
        <div style={{ position: 'absolute', bottom: 80, left: 16, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
          <GlobeBottomControls
            quizMode={quizMode}
            promoteMode={promoteMode}
            isSpinning={isSpinning}
            onToggleQuizMode={toggleQuizMode}
            onTogglePromoteMode={togglePromoteMode}
            onRandomSpin={handleRandomSpin}
            labels={{
              quizButton: tQuiz('quizButton'),
              exitQuiz: tQuiz('exitQuiz'),
              promoteButton: t('promoteButton'),
              exitPromote: t('exitPromote'),
              spinning: t('spinning'),
              quizSpin: tQuiz('quizSpin'),
              randomSpin: t('randomSpin'),
            }}
          />
          <TierLegend
            isMobileUI={isMobileUI}
            showPopup={showTierPopup}
            onTogglePopup={() => setShowTierPopup(p => !p)}
            t={t}
          />
        </div>
      )}
    </div>
  )
}
