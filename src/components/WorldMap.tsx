'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as topojson from 'topojson-client'
import type { Topology } from 'topojson-specification'
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson'
import isoCountries from 'i18n-iso-countries'
import localeKo from 'i18n-iso-countries/langs/ko.json'
import localeEn from 'i18n-iso-countries/langs/en.json'

isoCountries.registerLocale(localeKo)
isoCountries.registerLocale(localeEn)

const SUPPORTED_LOCALES = ['ko', 'en']

function getLocale(): string {
  if (typeof navigator === 'undefined') return 'en'
  const lang = navigator.language.split('-')[0]
  return SUPPORTED_LOCALES.includes(lang) ? lang : 'en'
}

const LOCALE = getLocale()
import {
  geoOrthographic,
  geoPath,
  geoGraticule,
} from 'd3-geo'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const worldTopo = require('world-atlas/countries-110m.json') as Topology

type CountryProps = { name: string }

const worldGeo = topojson.feature(
  worldTopo,
  worldTopo.objects.countries
) as FeatureCollection<Geometry, CountryProps>

const landGeo = topojson.feature(worldTopo, worldTopo.objects.land) as FeatureCollection

type ClickEntry = { name?: string; total: number }
type ClickData = { [alpha2: string]: ClickEntry }

function topN(data: ClickData, n = 10) {
  return Object.entries(data)
    .map(([alpha2, entry]) => ({ alpha2, name: entry.name ?? alpha2, count: entry.total }))
    .filter(e => e.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}

const TIERS = [
  { min: 1,    max: 9,        color: '#60a5fa', label: '1–9',     tag: '입문' },
  { min: 10,   max: 49,       color: '#818cf8', label: '10–49',   tag: '활발' },
  { min: 50,   max: 199,      color: '#c084fc', label: '50–199',  tag: '인기' },
  { min: 200,  max: 999,      color: '#f472b6', label: '200–999', tag: '핫' },
  { min: 1000, max: Infinity, color: '#fb7185', label: '1000+',   tag: '🔥전설' },
]

function countryColor(count: number): string {
  if (count === 0) return '#2d4a6b'
  return TIERS.find(t => count >= t.min && count <= t.max)?.color ?? '#fb7185'
}

const MEDALS = ['🥇', '🥈', '🥉']

const glass: React.CSSProperties = {
  background: 'rgba(9,9,11,0.82)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
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
  // hover된 나라
  const [hoveredAlpha2, setHoveredAlpha2] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ name: string; count: number; x: number; y: number } | null>(null)
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
    const updated: ClickEntry = await res.json()
    const merged: ClickEntry = { name, total: updated.total }
    clickDataRef.current = { ...clickDataRef.current, [alpha2]: merged }
    setClickData({ ...clickDataRef.current })
    setTooltip(prev => prev ? { ...prev, count: updated.total } : null)
  }, [getAlpha2AtPoint])

  // 스크롤 줌
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    scaleRef.current = Math.max(-3, Math.min(5, scaleRef.current - e.deltaY * 0.003))
  }, [])

  const allTimeTop = topN(clickData)
  const maxCount = allTimeTop[0]?.count ?? 1
  const totalClicks = Object.values(clickData).reduce((s, e) => s + e.total, 0)
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
                <div style={{ fontSize: 11, color: '#a78bfa', marginTop: 3 }}>🖱 {tooltip.count.toLocaleString()}회 클릭</div>
                <div style={{ fontSize: 11, marginTop: 2, color: TIERS.find(t => tooltip.count >= t.min && tooltip.count <= t.max)?.color ?? '#a78bfa' }}>
                  {TIERS.find(t => tooltip.count >= t.min && tooltip.count <= t.max)?.tag}
                </div>
              </>
            : <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>클릭해서 기록하기</div>
          }
        </div>
      )}

      {/* 안내 — 좌상단 */}
      <div style={{ ...glass, position: 'absolute', top: 16, left: 16, zIndex: 1000, borderRadius: 10, padding: '7px 13px', fontSize: 11, color: '#64748b' }}>
        드래그 회전 &middot; 스크롤 줌 &middot; 클릭으로 카운트
      </div>

      {/* 통계 패널 — 우상단 */}
      <div style={{ ...glass, position: 'absolute', top: 16, right: 16, zIndex: 1000, borderRadius: 16, padding: 16, width: 240 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1, background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.2)', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#a78bfa', lineHeight: 1 }}>{totalClicks.toLocaleString()}</div>
            <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>총 클릭</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#60a5fa', lineHeight: 1 }}>{countryCount}</div>
            <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>방문 국가</div>
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
          🏆 Most Clicked
        </div>
        {allTimeTop.length === 0 ? (
          <p style={{ color: '#334155', fontSize: 12 }}>아직 클릭 데이터가 없어요</p>
        ) : (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {allTimeTop.map((e, i) => (
              <li key={e.alpha2} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 20, textAlign: 'center', fontSize: i < 3 ? 14 : 11, color: '#475569', flexShrink: 0 }}>
                  {i < 3 ? MEDALS[i] : i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                      {e.name}
                    </span>
                    <span style={{ fontSize: 11, color: '#a78bfa', flexShrink: 0, marginLeft: 6 }}>
                      {e.count.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${(e.count / maxCount) * 100}%`,
                      background: 'linear-gradient(90deg, #818cf8, #c084fc)',
                      borderRadius: 2,
                    }} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* 범례 — 좌하단 */}
      <div style={{ ...glass, position: 'absolute', bottom: 32, left: 16, zIndex: 1000, borderRadius: 12, padding: '10px 14px' }}>
        <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
          클릭 수 티어
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {TIERS.map(t => (
            <div key={t.tag} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: t.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#94a3b8', minWidth: 60 }}>{t.label}</span>
              <span style={{ fontSize: 11, color: t.color, fontWeight: 600 }}>{t.tag}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
