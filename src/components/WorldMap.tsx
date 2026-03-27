'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import type { StyleFunction, LeafletMouseEvent } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import * as topojson from 'topojson-client'
import type { Topology } from 'topojson-specification'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import isoCountries from 'i18n-iso-countries'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const worldTopo = require('world-atlas/countries-110m.json') as Topology

type CountryProps = { name: string }

const worldGeo = topojson.feature(
  worldTopo,
  worldTopo.objects.countries
) as FeatureCollection<Geometry, CountryProps>

type ClickEntry = { name?: string; total: number }
type ClickData = { [alpha2: string]: ClickEntry }

function topN(data: ClickData, n = 10) {
  return Object.entries(data)
    .map(([alpha2, entry]) => ({ alpha2, name: entry.name ?? alpha2, count: entry.total }))
    .filter(e => e.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}

// 티어별 색상 — 테두리 없이 fill만 사용 (Voyager 타일이 국경선 담당)
const TIERS = [
  { min: 1,   max: 9,    color: '#60a5fa', label: '1–9',    tag: '입문' },
  { min: 10,  max: 49,   color: '#818cf8', label: '10–49',  tag: '활발' },
  { min: 50,  max: 199,  color: '#c084fc', label: '50–199', tag: '인기' },
  { min: 200, max: 999,  color: '#f472b6', label: '200–999',tag: '핫' },
  { min: 1000,max: Infinity, color: '#fb7185', label: '1000+', tag: '🔥전설' },
]

function countryColor(count: number): string {
  if (count === 0) return 'transparent'
  return TIERS.find(t => count >= t.min && count <= t.max)?.color ?? '#fb7185'
}

function countryOpacity(count: number): number {
  if (count === 0)   return 0
  if (count < 10)   return 0.42
  if (count < 50)   return 0.55
  if (count < 200)  return 0.65
  if (count < 1000) return 0.75
  return 0.85
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
  const [clickData, setClickData] = useState<ClickData>({})
  const clickDataRef = useRef<ClickData>({})
  const [geoKey, setGeoKey] = useState(0)

  useEffect(() => {
    fetch('/api/clicks')
      .then(r => r.json())
      .then((data: ClickData) => {
        clickDataRef.current = data
        setClickData(data)
      })
  }, [])

  const handleFeatureClick = useCallback(async (numericId: string, geoName: string) => {
    const alpha2 = isoCountries.numericToAlpha2(numericId)
    if (!alpha2) return

    const res = await fetch('/api/clicks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alpha2, name: geoName }),
    })
    const updated: ClickEntry = await res.json()
    const prev = clickDataRef.current[alpha2]
    const merged: ClickEntry = { name: prev?.name ?? geoName, total: updated.total }

    clickDataRef.current = { ...clickDataRef.current, [alpha2]: merged }
    setClickData({ ...clickDataRef.current })
    setGeoKey(k => k + 1)
  }, [])

  const onEachFeature = useCallback(
    (feature: Feature<Geometry, CountryProps>, layer: L.Layer) => {
      const numericId = String((feature as Feature & { id?: string | number }).id ?? '')
      const geoName = feature.properties?.name ?? numericId
      const alpha2 = isoCountries.numericToAlpha2(numericId)
      const pathLayer = layer as L.Path

      pathLayer.on({
        click: () => handleFeatureClick(numericId, geoName),
        mouseover: (e: LeafletMouseEvent) => {
          const count = alpha2 ? (clickDataRef.current[alpha2]?.total ?? 0) : 0
          // 테두리만 볼드 처리 — fill은 그대로, 국경선만 강조
          e.target.setStyle({
            weight: 2,
            color: '#fff',
            fillOpacity: count > 0 ? Math.min(countryOpacity(count) + 0.15, 1) : 0.18,
          })
          e.target.openTooltip()
        },
        mouseout: (e: LeafletMouseEvent) => {
          const count = alpha2 ? (clickDataRef.current[alpha2]?.total ?? 0) : 0
          e.target.setStyle({
            weight: 0,
            color: 'transparent',
            fillOpacity: countryOpacity(count),
          })
          e.target.closeTooltip()
        },
      })

      const count = alpha2 ? (clickDataRef.current[alpha2]?.total ?? 0) : 0
      const tier = TIERS.find(t => count >= t.min && count <= t.max)

      pathLayer.bindTooltip(
        `<div class="wm-tooltip">
          <div class="wm-tooltip-name">${geoName}</div>
          ${count > 0
            ? `<div class="wm-tooltip-count">🖱 ${count.toLocaleString()}회 클릭</div>
               <div class="wm-tooltip-tier" style="color:${tier?.color ?? '#a78bfa'}">${tier?.tag ?? ''}</div>`
            : `<div class="wm-tooltip-hint">클릭해서 기록하기</div>`}
        </div>`,
        { sticky: true, opacity: 1, className: 'wm-tooltip-wrapper' }
      )
    },
    [handleFeatureClick]
  )

  // 테두리 완전 제거 → 가로줄 아티팩트 해결
  const styleFeature: StyleFunction = useCallback((feature?: Feature) => {
    const numericId = String((feature as (Feature & { id?: string | number }) | undefined)?.id ?? '')
    const alpha2 = isoCountries.numericToAlpha2(numericId)
    const count = alpha2 ? (clickDataRef.current[alpha2]?.total ?? 0) : 0
    return {
      fillColor: countryColor(count),
      fillOpacity: countryOpacity(count),
      color: 'transparent',
      weight: 0,
    }
  }, [])

  const allTimeTop = topN(clickData)
  const maxCount = allTimeTop[0]?.count ?? 1
  const totalClicks = Object.values(clickData).reduce((s, e) => s + e.total, 0)
  const countryCount = Object.keys(clickData).length

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxZoom={8}
        doubleClickZoom={false}
        style={{ height: '100%', width: '100%' }}
        worldCopyJump={false}
        maxBounds={[[-85, -210], [85, 210]]}
        maxBoundsViscosity={0.4}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
          subdomains="abcd"
        />
        <GeoJSON key={geoKey} data={worldGeo} style={styleFeature} onEachFeature={onEachFeature} />
      </MapContainer>

      {/* 안내 — 좌상단 */}
      <div style={{ ...glass, position: 'absolute', top: 16, left: 16, zIndex: 1000, borderRadius: 10, padding: '7px 13px', fontSize: 11, color: '#64748b' }}>
        스크롤 줌 &middot; 드래그 이동 &middot; 클릭으로 카운트
      </div>

      {/* 통계 패널 — 우상단 */}
      <div style={{ ...glass, position: 'absolute', top: 16, right: 16, zIndex: 1000, borderRadius: 16, padding: 16, width: 240 }}>
        {/* 요약 수치 */}
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
                      transition: 'width 0.4s ease',
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
