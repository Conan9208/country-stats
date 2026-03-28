'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as topojson from 'topojson-client'
import type { Topology } from 'topojson-specification'
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson'
import isoCountries from 'i18n-iso-countries'
import localeKo from 'i18n-iso-countries/langs/ko.json'
import localeEn from 'i18n-iso-countries/langs/en.json'
import { geoOrthographic, geoPath, geoGraticule } from 'd3-geo'
import StarField from '@/components/StarField'
import CommentPanel from '@/components/CommentPanel'
import DebtModal from '@/components/DebtModal'
import CountryInfoModal from '@/components/CountryInfoModal'
import type { ClickData, ClickEntry, CountryProps, TooltipState } from '@/types/map'
import { TIERS, glass } from '@/lib/mapConstants'
import { formatCount, countryColor, getTier, topN, topNToday, getLocale } from '@/lib/mapUtils'
import { supabase } from '@/lib/supabase'

isoCountries.registerLocale(localeKo)
isoCountries.registerLocale(localeEn)

const LOCALE = getLocale()

// eslint-disable-next-line @typescript-eslint/no-require-imports
const worldTopo = require('world-atlas/countries-110m.json') as Topology

const worldGeo = topojson.feature(
  worldTopo,
  worldTopo.objects.countries
) as FeatureCollection<Geometry, CountryProps>

const landGeo = topojson.feature(worldTopo, worldTopo.objects.land) as FeatureCollection

// 모듈 레벨 1회 계산 — 매 프레임 재계산 방지
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const bordersMesh = topojson.mesh(worldTopo as any, (worldTopo as any).objects.countries, (a: unknown, b: unknown) => a !== b) as unknown as Feature<Geometry, GeoJsonProperties>
const graticuleData = geoGraticule()()

// numericId → alpha2 lookup map
const alpha2Map = new Map<string, string>()
for (const f of worldGeo.features) {
  const numericId = String((f as Feature & { id?: string | number }).id ?? '')
  const a2 = isoCountries.numericToAlpha2(numericId)
  if (a2) alpha2Map.set(numericId, a2)
}

// alpha2 → feature lookup map (플래시 효과용)
const featureByAlpha2 = new Map<string, Feature<Geometry, CountryProps>>()
for (const f of worldGeo.features) {
  const numericId = String((f as Feature & { id?: string | number }).id ?? '')
  const a2 = alpha2Map.get(numericId)
  if (a2) featureByAlpha2.set(a2, f)
}

export default function WorldMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [clickData, setClickData] = useState<ClickData>({})
  const clickDataRef = useRef<ClickData>({})

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
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
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
  // 모달
  const [debtCountry, setDebtCountry]   = useState<{ code: string; name: string } | null>(null)
  const [infoCountry, setInfoCountry]   = useState<{ code: string; name: string } | null>(null)
  const [toast, setToast] = useState<{ message: string; sub: string } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 내 클릭 기록 (localStorage)
  const myClicksRef = useRef<Set<string>>(new Set())
  const [myClickCount, setMyClickCount] = useState(0)
  const animFrameRef = useRef<number>(0)
  // 자동 회전
  const autoRotateRef = useRef(true)

  // 이펙트
  type Shockwave = { x: number; y: number; t: number }
  type Particle  = { x: number; y: number; vx: number; vy: number; t: number; size: number }
  type Flash     = { alpha2: string; t: number }
  type FloatNum  = { id: number; x: number; y: number; value: number; isRateLimit?: boolean }
  const shockwavesRef = useRef<Shockwave[]>([])
  const particlesRef  = useRef<Particle[]>([])
  const flashesRef    = useRef<Flash[]>([])
  const mousePosRef   = useRef<{ x: number; y: number } | null>(null)
  const [floatNums, setFloatNums] = useState<FloatNum[]>([])

  useEffect(() => {
    fetch('/api/clicks')
      .then(r => r.json())
      .then((data: ClickData) => {
        clickDataRef.current = data
        setClickData(data)
      })
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
          clickDataRef.current = {
            ...clickDataRef.current,
            [row.country_code]: {
              ...clickDataRef.current[row.country_code],
              // Math.max — 낙관적 업데이트보다 낮은 값으로 절대 뒤로 가지 않음
              total: Math.max(
                clickDataRef.current[row.country_code]?.total ?? 0,
                Number(row.view_count) || 0
              ),
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

  // clickData(서버 확정값)가 바뀔 때마다 tooltip도 같이 갱신 — 낙관적 flicker 방지
  useEffect(() => {
    setTooltip(prev => {
      if (!prev || !hoveredAlpha2Ref.current) return prev
      const confirmed = clickDataRef.current[hoveredAlpha2Ref.current]?.total ?? 0
      if (confirmed === prev.count) return prev
      return { ...prev, count: confirmed }
    })
  }, [clickData])

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

      ctx.beginPath()
      path(feature)

      if (isSelected) {
        // 우클릭 선택 나라: 밝은 주황 + 테두리 강조
        ctx.fillStyle = 'rgba(251,146,60,0.55)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(251,146,60,0.9)'
        ctx.lineWidth = 1.5
        ctx.stroke()
      } else if (isHovered) {
        ctx.fillStyle = 'rgba(255,255,255,0.35)'
        ctx.fill()
      } else if (count > 0) {
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
  }, [getProjection])

  // 자동 회전 + 관성 루프
  useEffect(() => {
    let last = performance.now()
    const loop = (now: number) => {
      const dt = now - last
      last = now
      if (!dragStartRef.current) {
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
  }, [draw])

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
    autoRotateRef.current = false
    hasDraggedRef.current = false
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      rotation: [...rotationRef.current] as [number, number],
    }
  }, [])

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
      hasDraggedRef.current = true
      hoveredAlpha2Ref.current = null
      setTooltip(null)
      return
    }

    // hover 감지
    const hit = getAlpha2AtPoint(x, y)
    if (hit?.alpha2) {
      const count = clickDataRef.current[hit.alpha2]?.total ?? 0
      const name = clickDataRef.current[hit.alpha2]?.name
        ?? isoCountries.getName(hit.alpha2, LOCALE)
        ?? hit.alpha2
      hoveredAlpha2Ref.current = hit.alpha2
      hoveredNameRef.current   = name
      setTooltip({ name, count, x: e.clientX - rect.left, y: e.clientY - rect.top })
    } else {
      hoveredAlpha2Ref.current = null
      hoveredNameRef.current   = null
      setTooltip(null)
    }
  }, [getAlpha2AtPoint, getProjection])

  const onMouseUp = useCallback(() => {
    dragStartRef.current = null
    lastMouseRef.current = null
  }, [])

  const onMouseLeave = useCallback(() => {
    dragStartRef.current = null
    mousePosRef.current = null
    lastMouseRef.current = null
    hoveredAlpha2Ref.current = null
    setTooltip(null)
    autoRotateRef.current = true
  }, [])

  const onClick = useCallback(async (e: React.MouseEvent) => {
    if (contextMenuRef.current) { closeContextMenu(); return }
    if (hasDraggedRef.current) return
    const alpha2 = hoveredAlpha2Ref.current
    if (!alpha2) return
    const name = hoveredNameRef.current ?? alpha2

    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // 즉시 이펙트
    const t = performance.now()
    shockwavesRef.current.push({ x, y, t })
    flashesRef.current.push({ alpha2, t })
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const speed = 55 + Math.random() * 30
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        t,
        size: 2.5 + Math.random() * 1.5,
      })
    }

    // 클릭 위치 미리 캡처 (await 이후엔 synthetic event 접근 불가)
    const container = containerRef.current
    const cRect = container?.getBoundingClientRect()
    const fx = cRect ? e.clientX - cRect.left : x
    const fy = cRect ? e.clientY - cRect.top  : y

    // 낙관적 업데이트: 지구본 색상만 즉시 반영 (tooltip은 건드리지 않음)
    const prevTotal = clickDataRef.current[alpha2]?.total ?? 0
    const optimistic = prevTotal + 1
    clickDataRef.current = {
      ...clickDataRef.current,
      [alpha2]: { ...clickDataRef.current[alpha2], name, total: optimistic },
    }
    setClickData({ ...clickDataRef.current })
    // tooltip은 useEffect(clickData)가 확정값으로 동기화 — 여기선 건드리지 않음

    // +1 플로팅 피드백
    const floatId = Date.now() + Math.random()
    setFloatNums(prev => [...prev, { id: floatId, x: fx, y: fy, value: 1 }])
    setTimeout(() => setFloatNums(prev => prev.filter(n => n.id !== floatId)), 1000)

    // 백그라운드에서 실제 API 호출 → 서버 값으로 보정
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
      // tooltip은 useEffect가 prevTotal로 자동 동기화
      // 이모지 float — 클릭이 튕겼음을 재밌게 표시
      const rlId = Date.now() + Math.random()
      setFloatNums(prev => [...prev, { id: rlId, x: fx, y: fy - 28, value: 0, isRateLimit: true }])
      setTimeout(() => setFloatNums(prev => prev.filter(n => n.id !== rlId)), 1500)
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      setToast({ message: '잠깐, 너무 빠르다! 🚦', sub: '1분에 10번까지만 클릭할 수 있어요.' })
      toastTimerRef.current = setTimeout(() => setToast(null), 3000)
      return
    }

    const updated: { total: number; today: number } = await res.json()
    // Math.max — 여러 요청이 순서 바뀌어 도착해도 절대 뒤로 가지 않음
    const confirmedTotal = Math.max(clickDataRef.current[alpha2]?.total ?? 0, updated.total)
    const merged: ClickEntry = { name, total: confirmedTotal, today: updated.today }
    clickDataRef.current = { ...clickDataRef.current, [alpha2]: merged }
    setClickData({ ...clickDataRef.current })
    // tooltip은 setClickData → useEffect가 자동 동기화

    // 내 클릭 기록 저장
    if (!myClicksRef.current.has(alpha2)) {
      myClicksRef.current.add(alpha2)
      setMyClickCount(myClicksRef.current.size)
      try { localStorage.setItem('my_clicked_countries', JSON.stringify([...myClicksRef.current])) } catch { /* ignore */ }
    }

    // 댓글 패널 열기
    setCommentCountry({ code: alpha2, name })
  }, [closeContextMenu])

  // 스크롤 줌
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    scaleRef.current = Math.max(-3, Math.min(5, scaleRef.current - e.deltaY * 0.003))
  }, [])

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const alpha2 = hoveredAlpha2Ref.current
    const name   = hoveredNameRef.current
    if (!alpha2 || !name) return
    selectedAlpha2Ref.current = alpha2
    const menu = { x: e.clientX, y: e.clientY, alpha2, name }
    contextMenuRef.current = menu
    setContextMenu(menu)
  }, [])

  const handleMenuSelect = useCallback((action: 'info' | 'debt' | 'comment', alpha2: string, name: string) => {
    closeContextMenu()
    if (action === 'info')    setInfoCountry({ code: alpha2, name })
    if (action === 'debt')    setDebtCountry({ code: alpha2, name })
    if (action === 'comment') setCommentCountry({ code: alpha2, name })
  }, [closeContextMenu])

  const allTimeTop = topN(clickData)
  const todayTop = topNToday(clickData)
  const totalClicks = Object.values(clickData).reduce((s, e) => s + (Number(e.total) || 0), 0)
  const countryCount = Object.keys(clickData).length

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
        onWheel={onWheel}
      />

      {/* 플로팅 피드백 */}
      {floatNums.map(n => (
        <div
          key={n.id}
          className={n.isRateLimit ? 'float-num float-num--rate-limit' : 'float-num'}
          style={{ left: n.x - 16, top: n.y - 24 }}
        >
          {n.isRateLimit ? '😤' : `+${n.value.toLocaleString()}`}
        </div>
      ))}

      {/* 툴팁 */}
      {tooltip && (
        <div style={{
          ...glass,
          position: 'absolute',
          left: tooltip.x - 14,
          top: tooltip.y - 10,
          transform: 'translateX(-100%)',
          borderRadius: 10,
          padding: '9px 13px',
          pointerEvents: 'none',
          zIndex: 1000,
          minWidth: 130,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{tooltip.name}</div>
          {tooltip.count > 0
            ? <>
                <div style={{ fontSize: 11, color: '#a78bfa', marginTop: 3 }}>🖱 {formatCount(tooltip.count)}회 클릭</div>
                <div style={{ fontSize: 11, marginTop: 2, color: getTier(tooltip.count)?.color ?? '#a78bfa' }}>
                  {getTier(tooltip.count)?.tag}
                </div>
              </>
            : <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>클릭해서 기록하기</div>
          }
        </div>
      )}

      {/* 토스트 알림 */}
      <div style={{
        position: 'absolute',
        bottom: 40,
        left: '50%',
        transform: `translateX(-50%) translateY(${toast ? 0 : 20}px)`,
        opacity: toast ? 1 : 0,
        transition: 'opacity 0.25s ease, transform 0.25s ease',
        pointerEvents: 'none',
        zIndex: 2000,
        ...glass,
        borderRadius: 14,
        padding: '12px 20px',
        textAlign: 'center',
        minWidth: 240,
        border: '1px solid rgba(251,146,60,0.35)',
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#fb923c' }}>
          {toast?.message}
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
          {toast?.sub}
        </div>
      </div>

      {/* 안내 — 좌상단 */}
      <div style={{ ...glass, position: 'absolute', top: 16, left: 16, zIndex: 1000, borderRadius: 10, padding: '7px 13px', fontSize: 11, color: '#64748b' }}>
        드래그 회전 &middot; 스크롤 줌 &middot; 클릭으로 카운트
      </div>

      {/* 댓글 패널 */}
      {commentCountry && (
        <CommentPanel
          countryCode={commentCountry.code}
          countryName={commentCountry.name}
          onClose={() => setCommentCountry(null)}
        />
      )}

      {/* 통계 패널 — 우상단 (댓글 패널 열릴 때 왼쪽으로 이동) */}
      <div style={{ ...glass, position: 'absolute', top: 16, right: commentCountry ? 324 : 16, zIndex: 1000, borderRadius: 16, padding: 16, width: 240, transition: 'right 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1, background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.2)', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#a78bfa', lineHeight: 1 }}>{formatCount(totalClicks)}</div>
            <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>총 클릭</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#60a5fa', lineHeight: 1 }}>{myClickCount}</div>
            <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>내 클릭 국가</div>
          </div>
        </div>

        <RankList title="🏆 전체" entries={allTimeTop} emptyMsg="아직 클릭 데이터가 없어요" onSelect={setCommentCountry} />
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '12px 0' }} />
        <RankList title="📅 오늘" entries={todayTop} emptyMsg="오늘 아직 클릭 없어요" live onSelect={setCommentCountry} />
      </div>

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
          {(['info', 'debt', 'comment'] as const).map((action) => {
            const labels = { info: '📊 기본 정보', debt: '💸 부채 정보', comment: '💬 댓글 보기' }
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

      {/* 범례 — 좌하단 */}
      <div style={{ ...glass, position: 'absolute', bottom: 32, left: 16, zIndex: 1000, borderRadius: 12, padding: '10px 14px' }}>
        <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
          클릭 수 티어
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
  )
}

type RankEntry = { alpha2: string; name: string; count: number }

function RankList({ title, entries, emptyMsg, live, onSelect }: {
  title: string
  entries: RankEntry[]
  emptyMsg: string
  live?: boolean
  onSelect: (c: { code: string; name: string }) => void
}) {
  const max = entries[0]?.count ?? 1
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{title}</span>
        {live && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#22c55e', fontWeight: 600 }}>
            <span className="animate-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            LIVE
          </span>
        )}
      </div>
      {entries.length === 0 ? (
        <p style={{ color: '#334155', fontSize: 12, margin: 0 }}>{emptyMsg}</p>
      ) : (
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto', paddingRight: 14, marginRight: -4, scrollbarWidth: 'thin', scrollbarColor: 'rgba(99,102,241,0.3) transparent' }}>
          {entries.map((e, i) => {
            const tier = TIERS.find(t => e.count >= t.min && e.count <= t.max)
            return (
              <li key={e.alpha2} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 20, textAlign: 'center', fontSize: i < 3 ? 13 : 11, color: '#475569', flexShrink: 0 }}>
                  {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                    <span
                      onClick={() => onSelect({ code: e.alpha2, name: e.name })}
                      style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.2)', textUnderlineOffset: 3 }}
                    >
                      {e.name}
                    </span>
                    <span style={{ fontSize: 11, color: tier?.color ?? '#a78bfa', flexShrink: 0, marginLeft: 6, fontWeight: 600 }}>
                      {formatCount(e.count)}
                    </span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(e.count / max) * 100}%`, background: `linear-gradient(90deg, ${tier?.color ?? '#818cf8'}, #c084fc)`, borderRadius: 2 }} />
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
