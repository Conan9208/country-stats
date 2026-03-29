'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { PollTodayResponse } from '@/types/poll'
import { glass } from '@/lib/mapConstants'
import isoCountries from 'i18n-iso-countries'
import localeKo from 'i18n-iso-countries/langs/ko.json'

isoCountries.registerLocale(localeKo as Parameters<typeof isoCountries.registerLocale>[0])

const MEDAL = ['🥇', '🥈', '🥉', '4위', '5위']
const RANK_COLORS = ['#facc15', '#a78bfa', '#60a5fa', '#94a3b8', '#94a3b8']

function flagEmoji(alpha2: string): string {
  return alpha2
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join('')
}

function countryName(alpha2: string): string {
  return isoCountries.getName(alpha2.toUpperCase(), 'ko') ?? alpha2
}

interface PollPanelProps {
  votedCountry: string | null
  onVote: (alpha2: string, name: string) => void
  onCancelVote: () => void
  onClose: () => void
}

export default function PollPanel({ votedCountry, onVote, onCancelVote, onClose }: PollPanelProps) {
  const [poll, setPoll] = useState<PollTodayResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const fetchPoll = useCallback(async () => {
    const res = await fetch('/api/polls/today')
    if (!res.ok) return
    const data: PollTodayResponse = await res.json()
    setPoll(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchPoll() }, [fetchPoll])

  // 투표가 확정되면 결과 갱신
  useEffect(() => {
    if (votedCountry) fetchPoll()
  }, [votedCountry, fetchPoll])

  // Realtime — 다른 사람 투표 즉시 반영
  useEffect(() => {
    const channel = supabase
      .channel('poll_panel_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'poll_votes' }, fetchPoll)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'poll_votes' }, fetchPoll)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchPoll])

  const myVote = votedCountry ?? poll?.myVote ?? null

  const top5 = poll
    ? Object.entries(poll.results).sort((a, b) => b[1] - a[1]).slice(0, 5)
    : []
  const maxVotes = top5[0]?.[1] ?? 1

  // 투표 취소
  const handleCancel = useCallback(async () => {
    setCancelling(true)
    await fetch('/api/polls/vote', { method: 'DELETE' })
    await fetchPoll()
    onCancelVote()
    setCancelling(false)
  }, [fetchPoll, onCancelVote])

  // 공유 — 결과 + "너도 투표해봐" 유도
  const buildShareText = useCallback(() => {
    if (!poll) return ''
    const topLines = top5
      .map(([alpha2, count], i) => {
        const pct = poll.totalVotes > 0 ? Math.round((count / poll.totalVotes) * 100) : 0
        return `${MEDAL[i]} ${flagEmoji(alpha2)} ${countryName(alpha2)} (${pct}%)`
      })
      .join('\n')
    const myLine = myVote
      ? `\n나는 ${flagEmoji(myVote)} ${countryName(myVote)}에 투표했어!`
      : ''
    return [
      `🗳️ ${poll.question.emoji} ${poll.question.text}`,
      `전 세계 ${poll.totalVotes.toLocaleString()}명 참여${myLine}`,
      '',
      topLines,
      '',
      '너도 투표해봐 👉 worldstats.vercel.app',
    ].join('\n')
  }, [poll, top5, myVote])

  const handleCopyShare = useCallback(async () => {
    const text = buildShareText()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
    }
  }, [buildShareText])

  const handleTwitterShare = useCallback(() => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(buildShareText())}`,
      '_blank'
    )
  }, [buildShareText])

  return (
    <div
      style={{
        ...glass,
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1100,
        borderRadius: 20,
        padding: '18px 16px',
        width: 268,
        maxHeight: 'calc(100vh - 100px)',
        overflowY: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', display: 'inline-block' }} className="animate-pulse" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', letterSpacing: '0.07em' }}>오늘의 투표</span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 18, lineHeight: 1, padding: '0 2px' }}
          title="투표 모드 끄기"
        >×</button>
      </div>

      {/* 질문 */}
      {poll ? (
        <div style={{
          background: 'rgba(167,139,250,0.1)',
          border: '1px solid rgba(167,139,250,0.25)',
          borderRadius: 12,
          padding: '10px 12px',
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>{poll.question.emoji}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', lineHeight: 1.4 }}>
            {poll.question.text}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              {poll.totalVotes.toLocaleString()}명 참여
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#22c55e', fontWeight: 600 }}>
              <span className="animate-pulse" style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              LIVE
            </span>
          </div>
        </div>
      ) : (
        <div style={{ height: 76, background: 'rgba(255,255,255,0.04)', borderRadius: 12, marginBottom: 12 }} />
      )}

      {/* 내 투표 상태 */}
      {myVote ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(52,211,153,0.08)',
          border: '1px solid rgba(52,211,153,0.3)',
          borderRadius: 10,
          padding: '7px 10px',
          marginBottom: 12,
        }}>
          <span style={{ fontSize: 20 }}>{flagEmoji(myVote)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#34d399', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {countryName(myVote)}
            </div>
            <div style={{ fontSize: 10, color: '#475569' }}>내 투표 ✓</div>
          </div>
          <button
            onClick={handleCancel}
            disabled={cancelling}
            style={{
              background: 'none',
              border: '1px solid rgba(248,113,113,0.3)',
              borderRadius: 6,
              cursor: cancelling ? 'not-allowed' : 'pointer',
              color: '#f87171',
              fontSize: 10,
              padding: '3px 7px',
              opacity: cancelling ? 0.5 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {cancelling ? '취소 중…' : '취소'}
          </button>
        </div>
      ) : (
        !loading && (
          <div style={{ fontSize: 12, color: '#475569', marginBottom: 12, textAlign: 'center', padding: '4px 0' }}>
            🌐 지구본에서 나라를 클릭해 투표하세요
          </div>
        )
      )}

      {/* 순위 */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 44, background: 'rgba(255,255,255,0.04)', borderRadius: 8 }} className="animate-pulse" />
          ))}
        </div>
      ) : top5.length === 0 ? (
        <div style={{ fontSize: 12, color: '#334155', textAlign: 'center', padding: '16px 0' }}>
          아직 투표가 없어요 — 첫 번째로 투표해보세요!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {top5.map(([alpha2, count], i) => {
            const pct = poll && poll.totalVotes > 0 ? Math.round((count / poll.totalVotes) * 100) : 0
            const isMyVote = alpha2 === myVote
            return (
              <div
                key={alpha2}
                style={{
                  border: `1px solid ${isMyVote ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.04)'}`,
                  borderRadius: 10,
                  padding: '6px 10px',
                  background: isMyVote ? 'rgba(52,211,153,0.05)' : 'rgba(255,255,255,0.02)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, minWidth: 20 }}>{MEDAL[i]}</span>
                  <span style={{ fontSize: 17 }}>{flagEmoji(alpha2)}</span>
                  <span style={{ fontSize: 12, color: '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isMyVote ? 700 : 400 }}>
                    {countryName(alpha2)}
                  </span>
                  <span style={{ fontSize: 11, color: RANK_COLORS[i], fontWeight: 600, flexShrink: 0 }}>{pct}%</span>
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                  <div style={{
                    height: '100%',
                    width: `${(count / maxVotes) * 100}%`,
                    borderRadius: 2,
                    background: RANK_COLORS[i],
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 공유 버튼 — 투표가 있을 때만 */}
      {poll && poll.totalVotes > 0 && (
        <div style={{ display: 'flex', gap: 7, marginTop: 14 }}>
          <button
            onClick={handleCopyShare}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 10,
              background: copied ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${copied ? 'rgba(52,211,153,0.35)' : 'rgba(255,255,255,0.08)'}`,
              color: copied ? '#34d399' : '#94a3b8',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {copied ? '✓ 복사됨!' : '📋 결과 공유'}
          </button>
          <button
            onClick={handleTwitterShare}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 10,
              background: 'rgba(29,161,242,0.1)',
              border: '1px solid rgba(29,161,242,0.25)',
              color: '#60a5fa',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🐦 X 공유
          </button>
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 10, color: '#1e293b', textAlign: 'center' }}>
        하루 1회 · 매일 자정(UTC) 새 질문
      </div>
    </div>
  )
}
