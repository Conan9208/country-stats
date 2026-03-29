'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import isoCountries from 'i18n-iso-countries'
import localeKo from 'i18n-iso-countries/langs/ko.json'

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

export default function CommentFeed() {
  const [comments, setComments] = useState<FeedComment[]>([])
  const [loading, setLoading] = useState(true)
  const newIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/comments/feed?limit=50')
      .then(r => r.json())
      .then(d => {
        setComments(d.comments ?? [])
        setLoading(false)
      })
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
          newIdsRef.current.add(row.id)
          setComments(prev => [{ ...row, isNew: true }, ...prev.slice(0, 49)])
          // 3초 후 fade-in 클래스 제거
          setTimeout(() => {
            newIdsRef.current.delete(row.id)
            setComments(prev => prev.map(c => c.id === row.id ? { ...c, isNew: false } : c))
          }, 3000)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-zinc-950" style={{ height: 'calc(100vh - 48px)' }}>
      {/* 헤더 */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <span className="text-base font-bold text-white">💬 실시간 피드</span>
        <div className="flex items-center gap-1.5">
          <span className="animate-pulse inline-block w-1.5 h-1.5 rounded-full bg-violet-400" />
          <span className="text-xs font-semibold text-violet-400 tracking-widest">LIVE</span>
        </div>
        {!loading && (
          <span className="ml-auto text-xs text-zinc-500">{comments.length}개</span>
        )}
      </div>

      {/* 피드 목록 */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-40 text-zinc-600 text-sm">불러오는 중...</div>
        )}

        {!loading && comments.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-6">
            <div className="text-4xl">🌍</div>
            <p className="text-zinc-400 text-sm font-medium">아직 댓글이 없어요</p>
            <p className="text-zinc-600 text-xs leading-relaxed">
              지구본 탭에서 나라를 우클릭하면<br />첫 댓글을 남길 수 있어요!
            </p>
          </div>
        )}

        {!loading && comments.length > 0 && (
          <div className="max-w-2xl mx-auto w-full">
            {comments.map(comment => {
              const name = isoCountries.getName(comment.country_code.toUpperCase(), 'ko') ?? comment.country_code
              return (
                <div
                  key={comment.id}
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
            })}
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
