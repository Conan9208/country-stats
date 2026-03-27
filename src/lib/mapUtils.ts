import type { ClickData } from '@/types/map'
import { TIERS, SUPPORTED_LOCALES } from '@/lib/mapConstants'

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

export function topN(data: ClickData, n = 20) {
  return Object.entries(data)
    .map(([alpha2, entry]) => ({ alpha2, name: entry.name ?? alpha2, count: entry.total }))
    .filter(e => e.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}

export function topNToday(data: ClickData, n = 20) {
  return Object.entries(data)
    .map(([alpha2, entry]) => ({ alpha2, name: entry.name ?? alpha2, count: entry.today ?? 0 }))
    .filter(e => e.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}

export function getLocale(): string {
  if (typeof navigator === 'undefined') return 'en'
  const lang = navigator.language.split('-')[0]
  return SUPPORTED_LOCALES.includes(lang) ? lang : 'en'
}
