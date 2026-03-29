'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

const tiers = [
  {
    emoji: '☕',
    amount: '$3',
    label: '커피 한 잔',
    desc: '이 정도면 충분히 감동입니다.',
  },
  {
    emoji: '🍜',
    amount: '$10',
    label: '점심 한 끼',
    desc: '진심으로 고맙습니다. 오늘 밤 업데이트 예약합니다.',
  },
  {
    emoji: '💸',
    amount: '자유롭게',
    label: '진짜 여유로운 분',
    desc: '…말이 필요 없습니다. 당신이 최고입니다.',
  },
]

export default function DonatePage() {
  const [selected, setSelected] = useState<number | null>(null)

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-2xl mx-auto px-6 py-16 flex flex-col gap-12">

        {/* 헤더 섹션 */}
        <div className="flex flex-col gap-4">
          <div>
            <Badge variant="outline" className="text-zinc-400 border-zinc-700 text-xs">
              just for rich people
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight">
            You don&apos;t need a reason.
            <br />
            But here you are.
          </h1>
          <p className="text-zinc-400 text-base leading-relaxed">
            사실 이 사이트, 돈이 하나도 안 들어요. 근데 그게 언제까지 계속될지는 모르죠.
          </p>
        </div>

        {/* 통계 카드 3개 */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '입장료', value: '$0' },
            { label: '구독료', value: '$0' },
            { label: '광고', value: '없음' },
          ].map(stat => (
            <div
              key={stat.label}
              className="bg-zinc-900 rounded-xl px-4 py-5 flex flex-col items-center gap-1"
            >
              <span className="text-2xl font-bold text-white">{stat.value}</span>
              <span className="text-xs text-zinc-500">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* 설명 텍스트 박스 */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <p className="text-zinc-400 text-sm leading-relaxed">
              솔직히 말하면, 딱히 불쌍하지 않아요. 서버 터지면 그냥 껐다 켜고, 데이터 빠지면 조용히 복구하고.
              그래도 가끔 커피 한 잔 사주시면 밤새 업데이트할 의욕이 생기긴 합니다.
            </p>
          </CardContent>
        </Card>

        {/* 티어 카드 */}
        <div className="flex flex-col gap-4">
          <p className="text-sm text-zinc-500">티어를 고른 다음 버튼을 누르면 됩니다. 금액은 BMC에서 조정할 수 있어요.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {tiers.map((tier, i) => (
              <button
                key={i}
                onClick={() => setSelected(i === selected ? null : i)}
                className={`bg-zinc-900 border rounded-xl p-5 flex flex-col gap-2 text-left transition-all ${
                  selected === i
                    ? 'border-white'
                    : 'border-zinc-700 hover:border-zinc-500'
                }`}
              >
                <span className="text-2xl">{tier.emoji}</span>
                <div>
                  <span className="text-lg font-bold text-white">{tier.amount}</span>
                  <span className="text-sm text-zinc-400 ml-2">{tier.label}</span>
                </div>
                <p className="text-xs text-zinc-500">{tier.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* CTA 버튼 */}
        <a
          href="https://buymeacoffee.com/YOUR_LINK"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-white text-zinc-950 hover:bg-zinc-100 transition-colors font-semibold py-4 rounded-xl text-base"
        >
          Buy Me a Coffee로 보내기 ↗
        </a>

        {/* 체크리스트 */}
        <ul className="flex flex-col gap-2">
          {[
            '완전 자발적입니다',
            '반복 결제 없음',
            '데이터 업데이트에 사용됩니다',
          ].map(item => (
            <li key={item} className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="text-zinc-500">✓</span>
              {item}
            </li>
          ))}
        </ul>

        {/* 푸터 문구 + 홈 링크 */}
        <div className="flex flex-col gap-4 items-center text-center">
          <p className="text-zinc-600 text-sm">이 탭을 클릭한 것만으로도 충분히 쿨한 사람입니다.</p>
          <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            ← 홈으로 돌아가기
          </Link>
        </div>

      </div>
    </main>
  )
}
