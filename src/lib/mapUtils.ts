import type { ClickData } from '@/types/map'
import { TIERS, SUPPORTED_LOCALES } from '@/lib/mapConstants'
import isoCountries from 'i18n-iso-countries'

export function formatCount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export function countryColor(count: number): string {
  if (count === 0) return '#2d4a6b'
  return TIERS.find(t => count >= t.min && count <= t.max)?.color ?? '#f8fafc'
}

export function getTier(count: number) {
  return TIERS.find(t => count >= t.min && count <= t.max) ?? null
}

export function topN(data: ClickData, locale: string, n = 20) {
  return Object.entries(data)
    .map(([alpha2, entry]) => ({ alpha2, name: isoCountries.getName(alpha2.toUpperCase(), locale) ?? entry.name ?? alpha2, count: entry.total }))
    .filter(e => e.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}

export function topNToday(data: ClickData, locale: string, n = 20) {
  return Object.entries(data)
    .map(([alpha2, entry]) => ({ alpha2, name: isoCountries.getName(alpha2.toUpperCase(), locale) ?? entry.name ?? alpha2, count: entry.today ?? 0 }))
    .filter(e => e.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}

// 투표 수 → 색상 (파랑→보라→핑크→금색 그라디언트)
export function pollVoteColor(votes: number, maxVotes: number): string {
  if (votes <= 0 || maxVotes <= 0) return 'transparent'
  const ratio = Math.min(votes / maxVotes, 1)
  // 0→blue, 0.33→purple, 0.66→pink, 1→gold
  if (ratio < 0.33) {
    const t = ratio / 0.33
    const r = Math.round(96 + t * (168 - 96))
    const g = Math.round(165 + t * (85 - 165))
    const b = Math.round(250 + t * (247 - 250))
    return `rgb(${r},${g},${b})`
  } else if (ratio < 0.66) {
    const t = (ratio - 0.33) / 0.33
    const r = Math.round(168 + t * (236 - 168))
    const g = Math.round(85 + t * (72 - 85))
    const b = Math.round(247 + t * (153 - 247))
    return `rgb(${r},${g},${b})`
  } else {
    const t = (ratio - 0.66) / 0.34
    const r = Math.round(236 + t * (250 - 236))
    const g = Math.round(72 + t * (204 - 72))
    const b = Math.round(153 + t * (21 - 153))
    return `rgb(${r},${g},${b})`
  }
}

export function getLocale(): string {
  if (typeof navigator === 'undefined') return 'en'
  const lang = navigator.language.split('-')[0]
  return SUPPORTED_LOCALES.includes(lang) ? lang : 'en'
}

export function formatPopulation(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B명`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M명`
  if (n >= 1e4) return `${Math.round(n / 1e4)}만명`
  return `${n.toLocaleString()}명`
}

export function formatArea(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M km²`
  return `${n.toLocaleString()} km²`
}
