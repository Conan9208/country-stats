'use client'

import { useEffect, useRef, useState, memo, useCallback } from 'react'
import { Vote } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import isoCountries from 'i18n-iso-countries'
import localeKo from 'i18n-iso-countries/langs/ko.json'
import localeEn from 'i18n-iso-countries/langs/en.json'
import { useTranslations, useLocale } from 'next-intl'

isoCountries.registerLocale(localeKo as Parameters<typeof isoCountries.registerLocale>[0])
isoCountries.registerLocale(localeEn as Parameters<typeof isoCountries.registerLocale>[0])

interface FeedReason {
  country_code: string
  reason: string
  created_at: string
  isNew?: boolean
  _key?: string
}

function flagEmoji(alpha2: string): string {
  return alpha2.toUpperCase().split('').map(c => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0))).join('')
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return '방금'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

const countryNameCache = new Map<string, Map<string, string>>()
function getCountryName(code: string, locale: string): string {
  if (!countryNameCache.has(locale)) countryNameCache.set(locale, new Map())
  const cache = countryNameCache.get(locale)!
  const key = code.toUpperCase()
  if (!cache.has(key)) cache.set(key, isoCountries.getName(key, locale) ?? key)
  return cache.get(key)!
}

const ReasonItem = memo(function ReasonItem({ item, locale }: { item: FeedReason; locale: string }) {
  const name = getCountryName(item.country_code, locale)
  return (
    <div
      className="border-b border-zinc-800/60 px-6 py-4"
      style={{
        animation: item.isNew ? 'feedFadeIn 0.4s ease' : undefined,
        background: item.isNew ? 'rgba(167,139,250,0.04)' : undefined,
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-lg leading-none">{flagEmoji(item.country_code)}</span>
        <span className="text-sm font-semibold text-zinc-200">{name}</span>
        <span className="text-zinc-700 text-xs">·</span>
        <span className="text-xs text-zinc-500">{timeAgo(item.created_at)}</span>
      </div>
      <p className="text-sm text-zinc-300 leading-relaxed pl-0.5">{item.reason}</p>
    </div>
  )
})

export default function PollReasonFeed() {
  const t = useTranslations('PollReasonFeed')
  const locale = useLocale()
  const [reasons, setReasons] = useState<FeedReason[]>([])
  const [loading, setLoading] = useState(true)
  const newTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const clearNewFlag = useCallback((key: string) => {
    setReasons(prev => {
      const idx = prev.findIndex(r => r._key === key)
      if (idx === -1 || !prev[idx].isNew) return prev
      const next = [...prev]
      next[idx] = { ...next[idx], isNew: false }
      return next
    })
    newTimersRef.current.delete(key)
  }, [])

  useEffect(() => {
    fetch('/api/polls/reasons?limit=50')
      .then(r => r.json())
      .then(d => {
        const items = (d.reasons ?? []) as FeedReason[]
        setReasons(items.map(r => ({ ...r, _key: r.country_code + r.created_at })))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    const timers = newTimersRef.current
    return () => { timers.forEach(t => clearTimeout(t)); timers.clear() }
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('poll_reason_feed_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'poll_votes' },
        (payload) => {
          const row = payload.new as { country_code: string; reason: string | null; created_at: string }
          if (!row.country_code || !row.reason) return
          const key = row.country_code + row.created_at
          const item: FeedReason = { ...row, reason: row.reason, isNew: true, _key: key }
          setReasons(prev => [item, ...prev.slice(0, 49)])
          const existing = newTimersRef.current.get(key)
          if (existing) clearTimeout(existing)
          newTimersRef.current.set(key, setTimeout(() => clearNewFlag(key), 3000))
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [clearNewFlag])

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-zinc-950">
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <span className="text-base font-bold text-white">{t('title')}</span>
        <div className="flex items-center gap-1.5">
          <span className="animate-pulse inline-block w-1.5 h-1.5 rounded-full bg-violet-400" />
          <span className="text-xs font-semibold text-violet-400 tracking-widest">LIVE</span>
        </div>
        {!loading && (
          <span className="ml-auto text-xs text-zinc-500">{t('count', { count: reasons.length })}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {loading && (
          <div className="flex items-center justify-center h-40 text-zinc-600 text-sm">{t('loading')}</div>
        )}

        {!loading && reasons.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-6">
            <div className="text-zinc-500"><Vote size={40} /></div>
            <p className="text-zinc-400 text-sm font-medium">{t('empty')}</p>
            <p className="text-zinc-600 text-xs leading-relaxed whitespace-pre-wrap">{t('emptyDesc')}</p>
          </div>
        )}

        {!loading && reasons.length > 0 && (
          <div className="max-w-2xl mx-auto w-full">
            {reasons.map(item => (
              <ReasonItem key={item._key} item={item} locale={locale} />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes feedFadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
