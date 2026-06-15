'use client'

import { useEffect, useRef, useState, memo, useCallback } from 'react'
import { Globe } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import isoCountries from 'i18n-iso-countries'
import localeKo from 'i18n-iso-countries/langs/ko.json'
import { useTranslations } from 'next-intl'

isoCountries.registerLocale(localeKo as Parameters<typeof isoCountries.registerLocale>[0])

interface FeedComment {
  id: string
  country_code: string
  content: string
  created_at: string
  isNew?: boolean
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

// 국가명 캐시 — 렌더마다 isoCountries.getName() 반복 호출 방지
const countryNameCache = new Map<string, string>()
function getCountryName(code: string): string {
  const key = code.toUpperCase()
  if (!countryNameCache.has(key)) {
    countryNameCache.set(key, isoCountries.getName(key, 'ko') ?? key)
  }
  return countryNameCache.get(key)!
}

// 댓글 아이템을 메모이즈 — isNew 변경 시에만 리렌더
const CommentItem = memo(function CommentItem({ comment }: { comment: FeedComment }) {
  const name = getCountryName(comment.country_code)
  return (
    <div
      className="border-b border-zinc-800/60 px-6 py-4"
      style={{
        animation: comment.isNew ? 'feedFadeIn 0.4s ease' : undefined,
        background: comment.isNew ? 'rgba(167,139,250,0.04)' : undefined,
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-lg leading-none">{flagEmoji(comment.country_code)}</span>
        <span className="text-sm font-semibold text-zinc-200">{name}</span>
        <span className="text-zinc-700 text-xs">·</span>
        <span className="text-xs text-zinc-500">{timeAgo(comment.created_at)}</span>
      </div>
      <p className="text-sm text-zinc-300 leading-relaxed pl-0.5">{comment.content}</p>
    </div>
  )
})

export default function CommentFeed() {
  const t = useTranslations('Feed')
  const [comments, setComments] = useState<FeedComment[]>([])
  const [loading, setLoading] = useState(true)
  // isNew 해제를 개별 setTimeout 대신 단일 타이머로 처리
  const newTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const clearNewFlag = useCallback((id: string) => {
    setComments(prev => {
      const idx = prev.findIndex(c => c.id === id)
      if (idx === -1 || !prev[idx].isNew) return prev
      const next = [...prev]
      next[idx] = { ...next[idx], isNew: false }
      return next
    })
    newTimersRef.current.delete(id)
  }, [])

  useEffect(() => {
    fetch('/api/comments/feed?limit=50')
      .then(r => r.json())
      .then(d => {
        setComments(d.comments ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // 언마운트 시 pending 타이머 정리
  useEffect(() => {
    const timers = newTimersRef.current
    return () => { timers.forEach(t => clearTimeout(t)); timers.clear() }
  }, [])

  // 실시간 구독
  useEffect(() => {
    const channel = supabase
      .channel('comment_feed_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'country_comments' },
        (payload) => {
          const row = payload.new as FeedComment
          if (!row.id || row.content === undefined) return
          setComments(prev => [{ ...row, isNew: true }, ...prev.slice(0, 49)])
          // 이미 타이머가 있으면 교체
          const existing = newTimersRef.current.get(row.id)
          if (existing) clearTimeout(existing)
          newTimersRef.current.set(row.id, setTimeout(() => clearNewFlag(row.id), 3000))
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [clearNewFlag])

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-zinc-950">
      {/* 헤더 */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <span className="text-base font-bold text-white">{t('title')}</span>
        <div className="flex items-center gap-1.5">
          <span className="animate-pulse inline-block w-1.5 h-1.5 rounded-full bg-violet-400" />
          <span className="text-xs font-semibold text-violet-400 tracking-widest">LIVE</span>
        </div>
        {!loading && (
          <span className="ml-auto text-xs text-zinc-500">{t('commentCount', { count: comments.length })}</span>
        )}
      </div>

      {/* 피드 목록 — min-h-0 필수: flex-1 + overflow-y-auto는 min-h-0 없으면 높이가 고정되지 않아 스크롤 시 layout recalculation 발생 */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading && (
          <div className="flex items-center justify-center h-40 text-zinc-600 text-sm">{t('loading')}</div>
        )}

        {!loading && comments.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-6">
            <div className="text-zinc-500"><Globe size={40} /></div>
            <p className="text-zinc-400 text-sm font-medium">{t('noComments')}</p>
            <p className="text-zinc-600 text-xs leading-relaxed whitespace-pre-wrap">
              {t('noCommentsDesc')}
            </p>
          </div>
        )}

        {!loading && comments.length > 0 && (
          <div className="max-w-2xl mx-auto w-full">
            {comments.map(comment => (
              <CommentItem key={comment.id} comment={comment} />
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
