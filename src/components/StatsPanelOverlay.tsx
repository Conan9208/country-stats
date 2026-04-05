'use client'

import { useState } from 'react'
import isoCountries from 'i18n-iso-countries'
import localeKo from 'i18n-iso-countries/langs/ko.json'
import localeEn from 'i18n-iso-countries/langs/en.json'
import { glass } from '@/lib/mapConstants'
import { formatCount, getLocale } from '@/lib/mapUtils'
import { flagEmoji } from '@/lib/geoData'
import RankList from '@/components/RankList'

isoCountries.registerLocale(localeKo)
isoCountries.registerLocale(localeEn)

const LOCALE = getLocale()
const MEDAL = ['🥇', '🥈', '🥉', '4위', '5위']
const POLL_COLORS = ['#facc15', '#a78bfa', '#60a5fa', '#94a3b8', '#94a3b8']

type RankEntry = { alpha2: string; name: string; count: number }

type CountryRef = { code: string; name: string }

type StatsPanelOverlayProps = {
  commentCountry: CountryRef | null
  totalClicks: number
  myClickCount: number
  allTimeTop: RankEntry[]
  todayTop: RankEntry[]
  onSelectCountry: (c: CountryRef) => void
  pollTotalVotes?: number
  pollQuestion?: { emoji: string; text: string } | null
  pollData?: Record<string, number>
  pollMyVote?: string | null
  onCancelPollVote?: () => void
  onStartPoll?: () => void
}

export default function StatsPanelOverlay({
  commentCountry,
  totalClicks,
  myClickCount,
  allTimeTop,
  todayTop,
  onSelectCountry,
  pollTotalVotes,
  pollQuestion,
  pollData,
  pollMyVote,
  onCancelPollVote,
  onStartPoll,
}: StatsPanelOverlayProps) {
  const [pollCopied, setPollCopied] = useState(false)

  const top5Poll = Object.entries(pollData ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const myVoteInTop5 = top5Poll.some(([a]) => a === pollMyVote)
  const showPollSection = (pollTotalVotes ?? 0) > 0 && pollQuestion

  const buildShareText = () => {
    const topLines = top5Poll.map(([a2, count], i) => {
      const pct = (pollTotalVotes ?? 0) > 0 ? Math.round(count / (pollTotalVotes ?? 1) * 100) : 0
      const name = isoCountries.getName(a2.toUpperCase(), LOCALE) ?? a2
      return `${MEDAL[i]} ${flagEmoji(a2)} ${name} (${pct}%)`
    }).join('\n')
    const myLine = pollMyVote
      ? `\n나는 ${flagEmoji(pollMyVote)} ${isoCountries.getName(pollMyVote.toUpperCase(), LOCALE) ?? pollMyVote}에 투표했어!`
      : ''
    return [
      `🗳️ ${pollQuestion!.emoji} ${pollQuestion!.text}`,
      `전 세계 ${(pollTotalVotes ?? 0).toLocaleString()}명 참여${myLine}`,
      '',
      topLines,
      '',
      '너도 투표해봐 👉 worldstats.vercel.app',
    ].join('\n')
  }

  const handlePollShare = async () => {
    const text = buildShareText()
    try {
      await navigator.clipboard.writeText(text)
      setPollCopied(true)
      setTimeout(() => setPollCopied(false), 2000)
    } catch {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
    }
  }

  const handleTwitterShare = () => {
    const text = buildShareText()
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div style={{ ...glass, position: 'absolute', top: 16, right: commentCountry ? 324 : 16, zIndex: 1000, borderRadius: 16, padding: 16, width: 240, transition: 'right 0.35s cubic-bezier(0.4,0,0.2,1)', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', scrollbarWidth: 'none' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.2)', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#a78bfa', lineHeight: 1 }}>{formatCount(totalClicks)}</div>
          <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>총 클릭</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#60a5fa', lineHeight: 1 }}>{myClickCount}</div>
          <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>내 클릭 국가</div>
        </div>
      </div>

      <RankList title="🏆 전체클릭 순위" entries={allTimeTop} emptyMsg="아직 클릭 데이터가 없어요" onSelect={onSelectCountry} />
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '12px 0' }} />
      <RankList title="📅 오늘클릭 순위" entries={todayTop} emptyMsg="오늘 아직 클릭 없어요" live onSelect={onSelectCountry} />

      {showPollSection && (
        <>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '12px 0' }} />
          {/* 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span className="animate-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', letterSpacing: '0.07em' }}>오늘의 투표</span>
            <span style={{ fontSize: 10, color: '#334155', marginLeft: 'auto' }}>{(pollTotalVotes ?? 0).toLocaleString()}명</span>
          </div>
          {/* 질문 */}
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10, lineHeight: 1.45 }}>
            {pollQuestion!.emoji} {pollQuestion!.text}
          </div>
          {/* TOP5 랭킹 */}
          {top5Poll.map(([alpha2, count], i) => {
            const pct = (pollTotalVotes ?? 0) > 0 ? Math.round(count / (pollTotalVotes ?? 1) * 100) : 0
            const isMyVote = pollMyVote === alpha2
            const name = isoCountries.getName(alpha2.toUpperCase(), LOCALE) ?? alpha2
            return (
              <div key={alpha2} style={{ marginBottom: 6, padding: '5px 7px', borderRadius: 8, border: isMyVote ? '1px solid rgba(167,139,250,0.5)' : '1px solid transparent', background: isMyVote ? 'rgba(167,139,250,0.08)' : 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <span style={{ fontSize: 11, minWidth: 20, color: POLL_COLORS[i] }}>{MEDAL[i]}</span>
                  <span style={{ fontSize: 13 }}>{flagEmoji(alpha2)}</span>
                  <span style={{ fontSize: 11, color: '#cbd5e1', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                  <span style={{ fontSize: 11, color: POLL_COLORS[i], fontWeight: 600, flexShrink: 0 }}>{pct}%</span>
                </div>
                <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: isMyVote ? '#a78bfa' : POLL_COLORS[i], borderRadius: 2, transition: 'width 0.4s ease' }} />
                </div>
              </div>
            )
          })}
          {/* 내 투표가 TOP5 밖일 때 */}
          {pollMyVote && !myVoteInTop5 && (
            <div style={{ marginBottom: 6, padding: '5px 7px', borderRadius: 8, border: '1px solid rgba(167,139,250,0.5)', background: 'rgba(167,139,250,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 11, color: '#a78bfa', minWidth: 20 }}>내</span>
                <span style={{ fontSize: 13 }}>{flagEmoji(pollMyVote)}</span>
                <span style={{ fontSize: 11, color: '#a78bfa', flex: 1 }}>{isoCountries.getName(pollMyVote.toUpperCase(), LOCALE) ?? pollMyVote}</span>
              </div>
            </div>
          )}
          {/* 하단 버튼 영역 */}
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {pollMyVote ? (
              <>
                <button
                  onClick={onCancelPollVote}
                  style={{ flex: 1, padding: '5px 0', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', fontSize: 11, cursor: 'pointer' }}
                >취소</button>
                <button
                  onClick={handlePollShare}
                  style={{ flex: 1, padding: '5px 0', borderRadius: 8, background: pollCopied ? 'rgba(34,197,94,0.15)' : 'rgba(167,139,250,0.12)', border: `1px solid ${pollCopied ? 'rgba(34,197,94,0.3)' : 'rgba(167,139,250,0.25)'}`, color: pollCopied ? '#4ade80' : '#a78bfa', fontSize: 11, cursor: 'pointer' }}
                >{pollCopied ? '✓ 복사됨' : '📋 공유'}</button>
                <button
                  onClick={handleTwitterShare}
                  style={{ padding: '5px 8px', borderRadius: 8, background: 'rgba(29,161,242,0.1)', border: '1px solid rgba(29,161,242,0.25)', color: '#38bdf8', fontSize: 11, cursor: 'pointer' }}
                >𝕏</button>
              </>
            ) : (
              <button
                onClick={onStartPoll}
                style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: 'linear-gradient(135deg,rgba(124,58,237,0.2),rgba(168,85,247,0.2))', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >🗳️ 지금 투표하기 →</button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
