'use client'

import { useState } from 'react'
import CommentFeed from './CommentFeed'
import PollReasonFeed from './PollReasonFeed'

export default function CombinedFeed() {
  const [subTab, setSubTab] = useState<'comments' | 'reasons'>('comments')

  return (
    <>
      {/* 데스크탑: 2칸 나란히 */}
      <div className="hidden sm:grid sm:grid-cols-2 sm:divide-x sm:divide-zinc-800 flex-1 overflow-hidden">
        <CommentFeed />
        <PollReasonFeed />
      </div>

      {/* 모바일: 상단 서브탭 */}
      <div className="sm:hidden flex-1 overflow-hidden flex flex-col">
        <div className="flex border-b border-zinc-800 flex-shrink-0">
          <button
            onClick={() => setSubTab('comments')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              subTab === 'comments'
                ? 'text-white border-b-2 border-white -mb-px'
                : 'text-zinc-500'
            }`}
          >
            💬 댓글
          </button>
          <button
            onClick={() => setSubTab('reasons')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              subTab === 'reasons'
                ? 'text-white border-b-2 border-white -mb-px'
                : 'text-zinc-500'
            }`}
          >
            🗳️ 투표 이유
          </button>
        </div>
        {subTab === 'comments' ? <CommentFeed /> : <PollReasonFeed />}
      </div>
    </>
  )
}
