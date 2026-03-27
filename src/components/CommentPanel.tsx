'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { glass } from '@/lib/mapConstants'

type Comment = {
  id: number
  content: string
  created_at: string
  report_count: number
}

type Props = {
  countryCode: string
  countryName: string
  onClose: () => void
}

const MAX_CHARS = 50

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0)  return `${d}일 전`
  if (h > 0)  return `${h}시간 전`
  if (m > 0)  return `${m}분 전`
  return '방금'
}

export default function CommentPanel({ countryCode, countryName, onClose }: Props) {
  const [comments, setComments]   = useState<Comment[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [hasMore, setHasMore]     = useState(false)
  const [loading, setLoading]     = useState(false)
  const [text, setText]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice]       = useState<{ msg: string; ok: boolean } | null>(null)
  const [reported, setReported]   = useState<Set<number>>(new Set())
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const fetchComments = useCallback(async (p: number, reset = false) => {
    setLoading(true)
    const res  = await fetch(`/api/comments?country=${countryCode}&page=${p}`)
    const data = await res.json()
    setLoading(false)
    if (!res.ok) return
    setComments(prev => reset ? data.comments : [...prev, ...data.comments])
    setTotal(data.total)
    setPage(p)
    setHasMore(data.hasMore)
  }, [countryCode])

  useEffect(() => {
    setComments([])
    setPage(1)
    setHasMore(false)
    fetchComments(1, true)
    inputRef.current?.focus()
  }, [countryCode, fetchComments])

  const showNotice = (msg: string, ok: boolean) => {
    setNotice({ msg, ok })
    setTimeout(() => setNotice(null), 3000)
  }

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return
    setSubmitting(true)
    const res = await fetch('/api/comments', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ country_code: countryCode, content: text.trim() }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { showNotice(data.error, false); return }
    setComments(prev => [data, ...prev])
    setTotal(t => t + 1)
    setText('')
    showNotice('등록됐어요!', true)
  }

  const handleReport = async (id: number) => {
    if (reported.has(id)) return
    const res = await fetch('/api/comments/report', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ comment_id: id }),
    })
    const data = await res.json()
    if (!res.ok) { showNotice(data.error, false); return }
    setReported(prev => new Set([...prev, id]))
    if (data.hidden) {
      setComments(prev => prev.filter(c => c.id !== id))
      setTotal(t => t - 1)
    }
    showNotice('신고했어요', true)
  }

  return (
    <div style={{
      ...glass,
      position: 'absolute',
      top: 16, right: 16, bottom: 16,
      width: 300,
      borderRadius: 18,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1100,
      overflow: 'hidden',
    }}>
      {/* 헤더 */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{countryName}</div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>댓글 {total.toLocaleString()}개</div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: 'none', color: '#64748b',
            width: 28, height: 28, borderRadius: 8, cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>
      </div>

      {/* 입력창 */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
          placeholder={`${countryName}에 대해 한마디...`}
          rows={2}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: '8px 10px',
            color: '#e2e8f0', fontSize: 13, resize: 'none',
            outline: 'none', fontFamily: 'inherit',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <span style={{ fontSize: 11, color: text.length >= MAX_CHARS ? '#f87171' : '#334155' }}>
            {text.length}/{MAX_CHARS}
          </span>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || submitting}
            style={{
              background: text.trim() ? 'rgba(129,140,248,0.3)' : 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(129,140,248,0.3)',
              color: text.trim() ? '#a78bfa' : '#334155',
              borderRadius: 8, padding: '5px 14px', fontSize: 12,
              fontWeight: 600, cursor: text.trim() ? 'pointer' : 'default',
              transition: 'all 0.15s',
            }}
          >
            {submitting ? '...' : '등록 ↵'}
          </button>
        </div>
        {notice && (
          <div style={{
            marginTop: 6, fontSize: 12, fontWeight: 600,
            color: notice.ok ? '#4ade80' : '#f87171',
          }}>
            {notice.msg}
          </div>
        )}
      </div>

      {/* 댓글 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(99,102,241,0.3) transparent' }}>
        {loading && comments.length === 0 ? (
          <div style={{ color: '#334155', fontSize: 12, marginTop: 12, textAlign: 'center' }}>불러오는 중...</div>
        ) : comments.length === 0 ? (
          <div style={{ color: '#334155', fontSize: 12, marginTop: 20, textAlign: 'center', lineHeight: 1.7 }}>
            아직 댓글이 없어요<br />첫 번째로 남겨보세요 ✍️
          </div>
        ) : (
          <>
            {comments.map(c => (
              <div key={c.id} style={{
                padding: '10px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5, wordBreak: 'break-all' }}>
                  {c.content}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 }}>
                  <span style={{ fontSize: 11, color: '#334155' }}>{timeAgo(c.created_at)}</span>
                  <button
                    onClick={() => handleReport(c.id)}
                    title="신고"
                    style={{
                      background: 'none', border: 'none', cursor: reported.has(c.id) ? 'default' : 'pointer',
                      fontSize: 11, color: reported.has(c.id) ? '#475569' : '#334155',
                      padding: '2px 4px', borderRadius: 4, transition: 'color 0.15s',
                    }}
                  >
                    {reported.has(c.id) ? '신고됨' : '🚩'}
                  </button>
                </div>
              </div>
            ))}
            {hasMore && (
              <button
                onClick={() => fetchComments(page + 1)}
                disabled={loading}
                style={{
                  width: '100%', marginTop: 8, padding: '8px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, color: '#475569', fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {loading ? '...' : '더 보기'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
