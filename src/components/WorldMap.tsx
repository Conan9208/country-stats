'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as topojson from 'topojson-client'
import type { Topology } from 'topojson-specification'
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson'
import isoCountries from 'i18n-iso-countries'
import localeKo from 'i18n-iso-countries/langs/ko.json'
import localeEn from 'i18n-iso-countries/langs/en.json'
import { geoOrthographic, geoPath, geoGraticule } from 'd3-geo'
import type { ClickData, ClickEntry, CountryProps, TooltipState } from '@/types/map'
import { TIERS, MEDALS, glass } from '@/lib/mapConstants'
import { formatCount, countryColor, getTier, topN, getLocale } from '@/lib/mapUtils'
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
  // hover된 나라
  const [hoveredAlpha2, setHoveredAlpha2] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [toast, setToast] = useState<{ message: string; sub: string } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 내 클릭 기록 (localStorage)
  const myClicksRef = useRef<Set<string>>(new Set())
  const [myClickCount, setMyClickCount] = useState(0)
  const animFrameRef = useRef<number>(0)
  // 자동 회전
  const autoRotateRef = useRef(true)

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
        setMyClickCount(arr.length)
      }
    } catch { /* ignore */ }
  }, [])

  // Supabase Realtime 구독 — 다른 사람이 클릭하면 내 화면도 업데이트
  useEffect(() => {
    const channel = supabase
      .channel('country_views_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'country_views' },
        (payload) => {
          const row = payload.new as { country_code: string; view_count: number; name?: string }
          if (!row?.country_code) return
          clickDataRef.current = {
            ...clickDataRef.current,
            [row.country_code]: {
              total: Number(row.view_count) || 0,
              name: row.name ?? clickDataRef.current[row.country_code]?.name,
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
      .translate([canvas.width / 2, canvas.height / 2])
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
    const graticule = geoGraticule()

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 바다 (구 배경)
    ctx.beginPath()
    path({ type: 'Sphere' } as Feature<Geometry, GeoJsonProperties>)
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
    path(graticule())
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
      const alpha2 = isoCountries.numericToAlpha2(numericId)
      const count = alpha2 ? (clickDataRef.current[alpha2]?.total ?? 0) : 0
      const isHovered = alpha2 === hoveredAlpha2

      ctx.beginPath()
      path(feature)

      if (isHovered) {
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
    path(topojson.mesh(worldTopo, worldTopo.objects.countries, (a, b) => a !== b))
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 0.4
    ctx.stroke()

    // 구 테두리
    ctx.beginPath()
    path({ type: 'Sphere' } as Feature<Geometry, GeoJsonProperties>)
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
    path({ type: 'Sphere' } as Feature<Geometry, GeoJsonProperties>)
    ctx.fillStyle = shineGrad
    ctx.fill()
  }, [getProjection, hoveredAlpha2])

  // 자동 회전 루프
  useEffect(() => {
    let last = performance.now()
    const loop = (now: number) => {
      if (autoRotateRef.current && !dragStartRef.current) {
        const dt = now - last
        rotationRef.current = [rotationRef.current[0] + dt * 0.004, rotationRef.current[1]]
      }
      last = now
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

  // 드래그
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    autoRotateRef.current = false
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

    if (dragStartRef.current) {
      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y
      const sensitivity = 0.15
      rotationRef.current = [
        dragStartRef.current.rotation[0] + dx * sensitivity,
        Math.max(-90, Math.min(90, dragStartRef.current.rotation[1] - dy * sensitivity)),
      ]
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
      setHoveredAlpha2(hit.alpha2)
      setTooltip({ name, count, x: e.clientX - rect.left, y: e.clientY - rect.top })
      canvas.style.cursor = 'pointer'
    } else {
      setHoveredAlpha2(null)
      setTooltip(null)
      canvas.style.cursor = 'grab'
    }
  }, [getAlpha2AtPoint])

  const onMouseUp = useCallback(() => {
    dragStartRef.current = null
  }, [])

  const onMouseLeave = useCallback(() => {
    dragStartRef.current = null
    setHoveredAlpha2(null)
    setTooltip(null)
    autoRotateRef.current = true
  }, [])

  const onClick = useCallback(async (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const hit = getAlpha2AtPoint(x, y)
    if (!hit?.alpha2) return

    const alpha2 = hit.alpha2
    const name = clickDataRef.current[alpha2]?.name
      ?? isoCountries.getName(alpha2, LOCALE)
      ?? alpha2

    const res = await fetch('/api/clicks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alpha2, name }),
    })

    if (res.status === 429) {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      setToast({ message: '잠깐, 너무 빠르다! 🚦', sub: '1분에 10번까지만 클릭할 수 있어요.' })
      toastTimerRef.current = setTimeout(() => setToast(null), 3000)
      return
    }

    const updated: ClickEntry = await res.json()
    const merged: ClickEntry = { name, total: updated.total }
    clickDataRef.current = { ...clickDataRef.current, [alpha2]: merged }
    setClickData({ ...clickDataRef.current })
    setTooltip(prev => prev ? { ...prev, count: updated.total } : null)

    // 내 클릭 기록 저장
    if (!myClicksRef.current.has(alpha2)) {
      myClicksRef.current.add(alpha2)
      setMyClickCount(myClicksRef.current.size)
      try { localStorage.setItem('my_clicked_countries', JSON.stringify([...myClicksRef.current])) } catch { /* ignore */ }
    }
  }, [getAlpha2AtPoint])

  // 스크롤 줌
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    scaleRef.current = Math.max(-3, Math.min(5, scaleRef.current - e.deltaY * 0.003))
  }, [])

  const allTimeTop = topN(clickData)
  const maxCount = allTimeTop[0]?.count ?? 1
  const totalClicks = Object.values(clickData).reduce((s, e) => s + (Number(e.total) || 0), 0)
  const countryCount = Object.keys(clickData).length

  return (
    <div ref={containerRef} style={{ position: 'relative', height: '100%', width: '100%', background: '#050a10', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', cursor: 'grab' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        onWheel={onWheel}
      />

      {/* 툴팁 */}
      {tooltip && (
        <div style={{
          ...glass,
          position: 'absolute',
          left: tooltip.x + 14,
          top: tooltip.y - 10,
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

      {/* 통계 패널 — 우상단 */}
      <div style={{ ...glass, position: 'absolute', top: 16, right: 16, zIndex: 1000, borderRadius: 16, padding: 16, width: 240 }}>
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

        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>🏆 Most Clicked</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#22c55e', fontWeight: 600, letterSpacing: 0 }}>
            <span className="animate-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            LIVE
          </span>
        </div>
        {allTimeTop.length === 0 ? (
          <p style={{ color: '#334155', fontSize: 12 }}>아직 클릭 데이터가 없어요</p>
        ) : (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
            {allTimeTop.map((e, i) => {
              const tier = TIERS.find(t => e.count >= t.min && e.count <= t.max)
              return (
                <li key={e.alpha2} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 20, textAlign: 'center', fontSize: i < 3 ? 14 : 11, color: '#475569', flexShrink: 0 }}>
                    {i < 3 ? MEDALS[i] : i + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>
                        {e.name}
                      </span>
                      <span style={{ fontSize: 11, color: tier?.color ?? '#a78bfa', flexShrink: 0, marginLeft: 6, fontWeight: 600 }}>
                        {formatCount(e.count)}
                      </span>
                    </div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${(e.count / maxCount) * 100}%`,
                        background: `linear-gradient(90deg, ${tier?.color ?? '#818cf8'}, #c084fc)`,
                        borderRadius: 2,
                      }} />
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>

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
