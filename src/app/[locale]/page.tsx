'use client'

import { useEffect, useState, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Globe, Send } from 'lucide-react'
import VoteReasonModal from '@/components/VoteReasonModal'
import { supabase } from '@/lib/supabase'
import CommentFeed from '@/components/CommentFeed'
import type { PollQuestion } from '@/types/poll'

const WorldMap = dynamic(() => import('@/components/WorldMap'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-zinc-950">
      <div className="w-10 h-10 rounded-full border-2 border-zinc-700 border-t-zinc-400 animate-spin" />
    </div>
  ),
})

const tabs = [
  { id: 'map', labelKey: 'globe' },
  { id: 'feed', labelKey: 'feed' },
]

type TabId = 'map' | 'feed'

function HomeContent() {
  const searchParams = useSearchParams()
  const rawTab = searchParams.get('tab')
  const initialTab: TabId = rawTab === 'feed' ? 'feed' : 'map'
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)
  const t = useTranslations('Nav')

  const [pollMode, setPollMode] = useState(false)
  const [voteModal, setVoteModal] = useState<{ alpha2: string; name: string } | null>(null)
  const [pollVotedCountry, setPollVotedCountry] = useState<string | null>(null)
  const [pollData, setPollData] = useState<Record<string, number>>({})
  const [pollQuestion, setPollQuestion] = useState<PollQuestion | null>(null)
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
        setPollQuestion(d.question ?? null)
        setPollTotalVotes(d.totalVotes ?? 0)
        setPollData(d.results ?? {})
        setPollVotedCountry(d.myVote ?? null)
      })
      .catch(() => {})
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
        }).catch(() => {})
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'poll_votes' }, () => {
        fetch('/api/polls/today').then(r => r.json()).then(d => {
          setPollData(d.results ?? {})
          setPollTotalVotes(d.totalVotes ?? 0)
        }).catch(() => {})
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeTab])

  const handlePollVote = useCallback(async (alpha2: string, name: string) => {
    const res = await fetch('/api/polls/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alpha2 }),
    })
    const data = await res.json() as { ok: boolean }
    if (data.ok) {
      setPollMode(false)
      setPollVotedCountry(alpha2)
      setVoteModal({ alpha2, name })
      fetch('/api/polls/today').then(r => r.json()).then(d => {
        setPollData(d.results ?? {})
        setPollTotalVotes(d.totalVotes ?? 0)
      }).catch(() => {})
    }
  }, [])

  const handleCancelPollVote = useCallback(async () => {
    await fetch('/api/polls/vote', { method: 'DELETE' })
    setPollVotedCountry(null)
    fetch('/api/polls/today').then(r => r.json()).then(d => {
      setPollData(d.results ?? {})
      setPollTotalVotes(d.totalVotes ?? 0)
      setPollVotedCountry(d.myVote ?? null)
    }).catch(() => {})
  }, [])

  return (
    <main className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-6 h-12">
          {activeTab === 'feed' ? (
            <button
              onClick={() => setActiveTab('map')}
              className="text-base font-bold tracking-tight whitespace-nowrap flex items-center gap-1.5 text-white hover:text-zinc-300 transition-colors"
            >
              <Send size={16} /> PostMyGlobe
            </button>
          ) : (
            <span className="text-base font-bold tracking-tight whitespace-nowrap flex items-center gap-1.5"><Globe size={16} /> PostMyGlobe</span>
          )}

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
                {t(tab.labelKey as any)}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          <div className="hidden sm:flex items-center gap-4 text-xs text-zinc-600">
            <Link href="/donate" className="px-2.5 py-1 rounded-md text-amber-300/80 bg-amber-400/10 border border-amber-400/20 hover:bg-amber-400/20 hover:text-amber-200 transition-all font-medium">{t('donate')}</Link>
            <Link href="/about" className="hover:text-zinc-400 transition-colors">{t('about')}</Link>
            <Link href="/privacy" className="hover:text-zinc-400 transition-colors">{t('privacy')}</Link>
            <Link href="/contact" className="hover:text-zinc-400 transition-colors">{t('contact')}</Link>
          </div>
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'map' && (
        <div className="flex-1 overflow-hidden relative">
          <WorldMap
            pollMode={pollMode}
            onPollVote={handlePollVote}
            pollVotedCountry={pollVotedCountry}
            pollData={pollData}
            pollQuestion={pollQuestion}
            pollTotalVotes={pollTotalVotes}
            pollMyVote={pollVotedCountry}
            onCancelPollVote={handleCancelPollVote}
            onStartPoll={() => setPollMode(true)}
          />
          {voteModal && (
            <VoteReasonModal
              alpha2={voteModal.alpha2}
              countryName={voteModal.name}
              onDone={() => setVoteModal(null)}
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
