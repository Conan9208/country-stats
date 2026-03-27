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

type ClickEntry = {
  name: string
  total: number
  daily: { [date: string]: number }
}
type ClickData = { [alpha2: string]: ClickEntry }

function today() {
  return new Date().toISOString().slice(0, 10)
}

function topN(data: ClickData, key: 'total' | 'today', n = 10) {
  return Object.entries(data)
    .map(([alpha2, entry]) => ({
      alpha2,
      name: entry.name,
      count: key === 'total' ? entry.total : (entry.daily[today()] ?? 0),
    }))
    .filter(e => e.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}

function countryColor(count: number): string {
  if (count === 0) return '#27272a'
  if (count < 5)  return '#1d4ed8'
  if (count < 20) return '#7c3aed'
  if (count < 50) return '#be185d'
  return '#dc2626'
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

    clickDataRef.current = { ...clickDataRef.current, [alpha2]: updated }
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
          e.target.setStyle({ fillColor: '#52525b', fillOpacity: 0.9 })
          e.target.openTooltip()
        },
        mouseout: (e: LeafletMouseEvent) => {
          const count = alpha2 ? (clickDataRef.current[alpha2]?.total ?? 0) : 0
          e.target.setStyle({ fillColor: countryColor(count), fillOpacity: 0.8 })
          e.target.closeTooltip()
        },
      })

      const count = alpha2 ? (clickDataRef.current[alpha2]?.total ?? 0) : 0
      pathLayer.bindTooltip(
        `<div style="background:#18181b;border:1px solid #3f3f46;color:#fff;padding:6px 10px;border-radius:6px;font-size:13px;line-height:1.5;">
          <strong>${geoName}</strong>${count > 0 ? `<br/><span style="color:#a1a1aa">${count}회</span>` : ''}
        </div>`,
        { sticky: true, opacity: 1, className: 'leaflet-tooltip-dark' }
      )
    },
    [handleFeatureClick]
  )

  const styleFeature: StyleFunction = useCallback(
    (feature?: Feature) => {
      const numericId = String((feature as (Feature & { id?: string | number }) | undefined)?.id ?? '')
      const alpha2 = isoCountries.numericToAlpha2(numericId)
      const count = alpha2 ? (clickDataRef.current[alpha2]?.total ?? 0) : 0
      return {
        fillColor: countryColor(count),
        fillOpacity: 0.8,
        color: '#3f3f46',
        weight: 0.5,
      }
    },
    []
  )

  const allTimeTop = topN(clickData, 'total')
  const todayTop = topN(clickData, 'today')

  return (
    <div className="flex gap-4 h-full">
      {/* 지도 */}
      <div className="flex-1 rounded-xl overflow-hidden relative min-h-[520px]">
        <MapContainer
          center={[20, 0]}
          zoom={2}
          minZoom={2}
          maxZoom={8}
          style={{ height: '100%', width: '100%', background: '#09090b' }}
          worldCopyJump={false}
          maxBounds={[[-90, -180], [90, 180]]}
          maxBoundsViscosity={1.0}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
            subdomains="abcd"
          />
          <GeoJSON
            key={geoKey}
            data={worldGeo}
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        </MapContainer>

        {/* 범례 */}
        <div className="absolute bottom-6 left-4 z-[1000] flex gap-2 items-center text-xs text-zinc-400 bg-zinc-950/80 backdrop-blur px-3 py-2 rounded-lg border border-zinc-800">
          {[
            { color: '#3f3f46', label: '0' },
            { color: '#1d4ed8', label: '1–4' },
            { color: '#7c3aed', label: '5–19' },
            { color: '#be185d', label: '20–49' },
            { color: '#dc2626', label: '50+' },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>

        {/* 안내 */}
        <div className="absolute top-3 left-3 z-[1000] text-xs text-zinc-400 bg-zinc-950/80 backdrop-blur px-2.5 py-1.5 rounded-lg border border-zinc-800">
          스크롤 줌 · 드래그 이동 · 클릭으로 카운트
        </div>
      </div>

      {/* 통계 패널 */}
      <div className="w-64 flex flex-col gap-4 shrink-0">
        <StatPanel title="🏆 전체 Top 10" entries={allTimeTop} />
        <StatPanel title="📅 오늘 Top 10" entries={todayTop} />
      </div>
    </div>
  )
}

function StatPanel({
  title,
  entries,
}: {
  title: string
  entries: { alpha2: string; name: string; count: number }[]
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex-1 overflow-auto">
      <h3 className="text-sm font-semibold text-zinc-300 mb-3">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-zinc-600 text-xs">아직 데이터가 없습니다</p>
      ) : (
        <ol className="space-y-1.5">
          {entries.map((e, i) => (
            <li key={e.alpha2} className="flex items-center gap-2 text-sm">
              <span className="text-zinc-500 w-5 text-right shrink-0">{i + 1}</span>
              <span className="flex-1 text-zinc-200 truncate">{e.name}</span>
              <span className="text-zinc-400 shrink-0">{e.count}회</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
