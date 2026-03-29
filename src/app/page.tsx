'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import VoteReasonModal from '@/components/VoteReasonModal'
import CommentFeed from '@/components/CommentFeed'
import { supabase } from '@/lib/supabase'

const WorldMap = dynamic(() => import('@/components/WorldMap'), { ssr: false })

const tabs = [
  { id: 'map', label: '🌍 지구본' },
  { id: 'feed', label: '💬 실시간 피드' },
]

type TabId = 'map' | 'feed'

function HomeContent() {
  const searchParams = useSearchParams()
  const rawTab = searchParams.get('tab')
  const initialTab: TabId = rawTab === 'feed' ? 'feed' : 'map'
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)

  const [pollMode, setPollMode] = useState(false)
  const [showPollIntro, setShowPollIntro] = useState(false)
  const [voteModal, setVoteModal] = useState<{ alpha2: string; name: string } | null>(null)
  const [pollVotedCountry, setPollVotedCountry] = useState<string | null>(null)
  const [pollData, setPollData] = useState<Record<string, number>>({})
  const [pollQuestion, setPollQuestion] = useState<{ emoji: string; text: string } | null>(null)
  const [pollTotalVotes, setPollTotalVotes] = useState(0)

  // 페이지 진입 시 방문 기록 (1회)
  useEffect(() => {
    fetch('/api/track', { method: 'POST' }).catch(() => {})
  }, [])

  // map 탭 진입 시 오늘의 질문 프리로드
  useEffect(() => {
    if (activeTab !== 'map') return
    fetch('/api/polls/today')
      .then(r => r.json())
      .then(d => {
        setShowPollIntro(false)
        setPollMode(false)
        setPollQuestion(d.question ?? null)
        setPollTotalVotes(d.totalVotes ?? 0)
        setPollData(d.results ?? {})
        setPollVotedCountry(d.myVote ?? null)
        if (!d.myVote) {
          setShowPollIntro(true)
        }
      })
  }, [activeTab])

  // 실시간 투표 반영
  useEffect(() => {
    if (activeTab !== 'map') return
    const channel = supabase
      .channel('page_poll_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'poll_votes' }, () => {
        fetch('/api/polls/today').then(r => r.json()).then(d => {
          setPollData(d.results ?? {})
          setPollTotalVotes(d.totalVotes ?? 0)
        })
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'poll_votes' }, () => {
        fetch('/api/polls/today').then(r => r.json()).then(d => {
          setPollData(d.results ?? {})
          setPollTotalVotes(d.totalVotes ?? 0)
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeTab])

  return (
    <main className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-6 h-12">
          <span className="text-base font-bold tracking-tight whitespace-nowrap">🌍 WorldStats</span>

          <div className="w-px h-5 bg-zinc-700" />

          <div className="flex gap-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={`px-5 h-12 text-sm font-medium transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'border-white text-white'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          <div className="hidden sm:flex items-center gap-4 text-xs text-zinc-600">
            <Link href="/donate" className="px-2.5 py-1 rounded-md text-amber-300/80 bg-amber-400/10 border border-amber-400/20 hover:bg-amber-400/20 hover:text-amber-200 transition-all font-medium">on a good day</Link>
            <Link href="/about" className="hover:text-zinc-400 transition-colors">About</Link>
            <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy</Link>
            <Link href="/contact" className="hover:text-zinc-400 transition-colors">Contact</Link>
          </div>
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'map' && (
        <div className="flex-1 overflow-hidden relative">
          <WorldMap
            pollMode={pollMode}
            onPollVote={(alpha2, name) => {
              setPollVotedCountry(alpha2)
              setVoteModal({ alpha2, name })
            }}
            pollVotedCountry={pollVotedCountry}
            pollData={pollData}
            pollQuestion={pollQuestion}
            pollTotalVotes={pollTotalVotes}
            pollMyVote={pollVotedCountry}
            onCancelPollVote={() => {
              fetch('/api/polls/vote', { method: 'DELETE' }).then(() =>
                fetch('/api/polls/today').then(r => r.json()).then(d => {
                  setPollVotedCountry(null)
                  setPollData(d.results ?? {})
                  setPollTotalVotes(d.totalVotes ?? 0)
                })
              )
            }}
            onStartPoll={() => setShowPollIntro(true)}
          />

          {/* 인트로 오버레이 */}
          {showPollIntro && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 1050, background: 'rgba(5,10,16,0.5)' }} />
          )}

          {/* 인트로 카드 */}
          {showPollIntro && pollQuestion && (
            <div
              className="poll-intro-card"
              style={{
                position: 'absolute', top: '50%', left: '50%',
                zIndex: 1100, width: 360,
                background: 'rgba(9,9,18,0.88)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(167,139,250,0.35)',
                borderRadius: 24,
                padding: '32px 28px 24px',
                boxShadow: '0 0 60px rgba(167,139,250,0.2), 0 24px 64px rgba(0,0,0,0.7)',
                textAlign: 'center',
              }}
            >
              <button
                onClick={() => setShowPollIntro(false)}
                title="닫고 일반 클릭 모드로"
                style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 18, lineHeight: 1 }}
              >×</button>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 99, padding: '4px 12px', marginBottom: 20 }}>
                <span className="animate-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', display: 'inline-block' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', letterSpacing: '0.08em' }}>오늘의 나라 투표</span>
              </div>

              <div style={{ fontSize: 52, marginBottom: 10, lineHeight: 1 }}>{pollQuestion.emoji}</div>
              <div style={{ fontFamily: "'Pacifico', cursive", fontSize: 22, color: '#f1f5f9', lineHeight: 1.4, marginBottom: 18 }}>
                {pollQuestion.text}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 24 }}>
                {pollTotalVotes > 0 ? `전 세계 ${pollTotalVotes.toLocaleString()}명이 참여 중` : '첫 번째로 투표해보세요!'}
              </div>

              <button
                onClick={() => { setShowPollIntro(false); setPollMode(true) }}
                style={{ width: '100%', padding: '13px 0', borderRadius: 14, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 24px rgba(167,139,250,0.4)' }}
              >
                🌍 지구본에서 나라 선택하기
              </button>
              <div style={{ fontSize: 11, color: '#334155', marginTop: 14 }}>
                하루 1회 투표 · 매일 자정 새 질문
              </div>
            </div>
          )}

          {/* 하단 투표 입장 버튼 (미투표 시만) */}
          {!pollMode && !showPollIntro && pollQuestion && !pollVotedCountry && (
            <button
              onClick={() => setShowPollIntro(true)}
              style={{
                position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
                zIndex: 1000,
                padding: '9px 22px', borderRadius: 99,
                background: 'rgba(124,58,237,0.18)',
                border: '1px solid rgba(167,139,250,0.35)',
                color: '#a78bfa', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', backdropFilter: 'blur(8px)',
                transition: 'all 0.2s',
              }}
            >
              🗳️ 오늘의 투표 참여하기
            </button>
          )}


          {/* 투표 후 이유 입력 → 축하 → 일반 모드 복귀 */}
          {voteModal && (
            <VoteReasonModal
              alpha2={voteModal.alpha2}
              countryName={voteModal.name}
              onDone={() => {
                setVoteModal(null)
                setPollMode(false)
                setShowPollIntro(false)
                fetch('/api/polls/today')
                  .then(r => r.json())
                  .then(d => {
                    setPollData(d.results ?? {})
                    setPollTotalVotes(d.totalVotes ?? 0)
                    setPollVotedCountry(d.myVote ?? null)
                  })
              }}
            />
          )}
        </div>
      )}

      {activeTab === 'feed' && <CommentFeed />}
    </main>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="h-screen bg-zinc-950" />}>
      <HomeContent />
    </Suspense>
  )
}
