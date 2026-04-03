import * as topojson from 'topojson-client'
import type { Topology } from 'topojson-specification'
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson'
import { geoGraticule, geoCentroid } from 'd3-geo'
import isoCountries from 'i18n-iso-countries'
import type { CountryProps } from '@/types/map'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const worldTopo = require('world-atlas/countries-110m.json') as Topology

export const worldGeo = topojson.feature(
  worldTopo,
  worldTopo.objects.countries
) as FeatureCollection<Geometry, CountryProps>

export const landGeo = topojson.feature(worldTopo, worldTopo.objects.land) as FeatureCollection

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const bordersMesh = topojson.mesh(worldTopo as any, (worldTopo as any).objects.countries, (a: unknown, b: unknown) => a !== b) as unknown as Feature<Geometry, GeoJsonProperties>

export const graticuleData = geoGraticule()()

// numericId → alpha2 lookup map
export const alpha2Map = new Map<string, string>()
for (const f of worldGeo.features) {
  const numericId = String((f as Feature & { id?: string | number }).id ?? '')
  const a2 = isoCountries.numericToAlpha2(numericId)
  if (a2) alpha2Map.set(numericId, a2)
}

// alpha2 → feature lookup map (플래시 효과용)
export const featureByAlpha2 = new Map<string, Feature<Geometry, CountryProps>>()
for (const f of worldGeo.features) {
  const numericId = String((f as Feature & { id?: string | number }).id ?? '')
  const a2 = alpha2Map.get(numericId)
  if (a2) featureByAlpha2.set(a2, f)
}

// alpha2 → geographic centroid (스핀 룰렛 + 뷰어 점 렌더링용)
export const centroidByAlpha2 = new Map<string, [number, number]>()
for (const f of worldGeo.features) {
  const numericId = String((f as Feature & { id?: string | number }).id ?? '')
  const a2 = alpha2Map.get(numericId)
  if (a2) centroidByAlpha2.set(a2, geoCentroid(f) as [number, number])
}

export function flagEmoji(alpha2: string): string {
  return alpha2.toUpperCase().split('').map(c => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0))).join('')
}
