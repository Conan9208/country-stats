import type { Tier } from '@/types/map'
import type React from 'react'

export const TIERS: Tier[] = [
  { min: 1,           max: 9,           color: '#93c5fd', label: '1–9',       tag: '입문' },
  { min: 10,          max: 99,          color: '#60a5fa', label: '10–99',     tag: '활발' },
  { min: 100,         max: 999,         color: '#818cf8', label: '100–999',   tag: '인기' },
  { min: 1_000,       max: 9_999,       color: '#c084fc', label: '1K–9K',     tag: '핫' },
  { min: 10_000,      max: 99_999,      color: '#f472b6', label: '10K–99K',   tag: '🔥전설' },
  { min: 100_000,     max: 999_999,     color: '#fb923c', label: '100K–999K', tag: '⚡신화' },
  { min: 1_000_000,   max: 99_999_999,  color: '#facc15', label: '1M–99M',    tag: '💫불멸' },
  { min: 100_000_000, max: Infinity,    color: '#f8fafc', label: '100M+',     tag: '👑레전드' },
]

export const MEDALS = ['🥇', '🥈', '🥉']

export const SUPPORTED_LOCALES = ['ko', 'en']

export const glass: React.CSSProperties = {
  background: 'rgba(9,9,11,0.82)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
}
