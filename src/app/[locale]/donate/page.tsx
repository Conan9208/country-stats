'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

const BMC_URL = 'https://buymeacoffee.com/YOUR_LINK'

const tiers = [
  {
    emoji: '☕',
    amount: '$3',
    label: '커피 한 잔',
    desc: '이 정도면 충분히 감동입니다.',
    tier: 'coffee' as const,
    maxChars: 100,
  },
  {
    emoji: '🍜',
    amount: '$10',
    label: '점심 한 끼',
    desc: '진심으로 고맙습니다. 오늘 밤 업데이트 예약합니다.',
    tier: 'lunch' as const,
    maxChars: 1000,
  },
  {
    emoji: '💸',
    amount: '자유롭게',
    label: '진짜 여유로운 분',
    desc: '…말이 필요 없습니다. 당신이 최고입니다.',
    tier: 'free' as const,
    maxChars: null,
  },
]

function calcFreeMaxChars(amount: number): number {
  if (amount < 3)  return 50
  if (amount < 10) return 100
  if (amount < 30) return 1000
  return Math.min(5000, Math.floor(amount * 100))
}

export default function DonatePage() {
  // 후원 후 리턴 상태
  const [fromBmc, setFromBmc] = useState(false)
  const [returnedTierIdx, setReturnedTierIdx] = useState<number | null>(null)

  // 일반 선택 상태 (후원 전)
  const [selected, setSelected] = useState<number | null>(null)
  const [freeAmount, setFreeAmount] = useState('')

  // 메시지 전송
  const [senderName, setSenderName] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<'success' | 'error' | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // BMC에서 리턴됐는지 감지
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('from') === 'bmc') {
      setFromBmc(true)
      const savedTier = sessionStorage.getItem('bmc_tier')
      const idx = tiers.findIndex(t => t.tier === savedTier)
      if (idx !== -1) setReturnedTierIdx(idx)
      const savedAmount = sessionStorage.getItem('bmc_amount')
      if (savedAmount) setFreeAmount(savedAmount)
      // URL 파라미터 제거 (새로고침 시 재진입 방지)
      window.history.replaceState({}, '', '/donate')
    }
  }, [])

  // 활성 티어 (리턴 후 복원 or 선택 중)
  const activeTierIdx = fromBmc ? returnedTierIdx : selected
  const activeTier = activeTierIdx !== null ? tiers[activeTierIdx] : null

  const maxChars = (() => {
    if (!activeTier) return 0
    if (activeTier.tier === 'free') return calcFreeMaxChars(Number(freeAmount) || 0)
    return activeTier.maxChars ?? 0
  })()

  function handleBmcClick() {
    if (selected === null) return
    // 선택한 티어 저장 후 BMC로 이동 (같은 탭)
    sessionStorage.setItem('bmc_tier', tiers[selected].tier)
    if (tiers[selected].tier === 'free' && freeAmount) {
      sessionStorage.setItem('bmc_amount', freeAmount)
    } else {
      sessionStorage.removeItem('bmc_amount')
    }
    window.location.href = BMC_URL
  }

  async function handleSend() {
    if (!activeTier || !message.trim()) return
    setSending(true)
    setResult(null)
    setErrorMsg('')
    try {
      const res = await fetch('/api/donate/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: activeTier.tier,
          amount: activeTier.tier === 'free' ? Number(freeAmount) || 0 : undefined,
          senderName: senderName.trim() || undefined,
          message: message.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult('success')
        setMessage('')
        setSenderName('')
        sessionStorage.removeItem('bmc_tier')
        sessionStorage.removeItem('bmc_amount')
      } else {
        setResult('error')
        setErrorMsg(data.error ?? '오류가 발생했습니다.')
      }
    } catch {
      setResult('error')
      setErrorMsg('네트워크 오류가 발생했습니다.')
    } finally {
      setSending(false)
    }
  }

  // ── 후원 완료 후 리턴 화면 ──────────────────────────────
  if (fromBmc) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="max-w-2xl mx-auto px-6 py-16 flex flex-col gap-8">

          {/* 감사 헤더 */}
          <div className="flex flex-col gap-3">
            <div className="text-4xl">🎉</div>
            <h1 className="text-3xl font-bold leading-tight">
              후원해주셔서 감사합니다!
            </h1>
            <p className="text-zinc-400 text-base">
              {activeTier
                ? `${activeTier.emoji} ${activeTier.label} 티어로 후원하셨군요. 메시지를 남겨주시면 직접 읽겠습니다.`
                : '메시지를 남겨주시면 직접 읽겠습니다.'}
            </p>
          </div>

          {/* 티어 미인식 시 수동 선택 */}
          {!activeTier && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-zinc-500">어떤 티어로 후원하셨나요?</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {tiers.map((tier, i) => (
                  <button
                    key={i}
                    onClick={() => setReturnedTierIdx(i)}
                    className={`bg-zinc-900 border rounded-xl p-5 flex flex-col gap-2 text-left transition-all ${
                      returnedTierIdx === i ? 'border-white' : 'border-zinc-700 hover:border-zinc-500'
                    }`}
                  >
                    <span className="text-2xl">{tier.emoji}</span>
                    <span className="text-base font-bold">{tier.amount}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 메시지 폼 */}
          {activeTier && (
            <div className="flex flex-col gap-5 border border-zinc-800 rounded-2xl p-6 bg-zinc-900">

              {/* Free tier 금액 입력 */}
              {activeTier.tier === 'free' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-400">후원 금액 (USD)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 text-sm">$</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="ex) 5"
                      value={freeAmount}
                      onChange={e => setFreeAmount(e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white w-28 focus:outline-none focus:border-zinc-500"
                    />
                    {Number(freeAmount) > 0 && (
                      <span className="text-xs text-zinc-500">
                        → 최대 {calcFreeMaxChars(Number(freeAmount)).toLocaleString()}자
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* 이름 */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">이름 (선택)</label>
                <input
                  type="text"
                  placeholder="익명으로 보내도 됩니다"
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  maxLength={50}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                />
              </div>

              {/* 메시지 */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">
                  메시지
                  {maxChars > 0 && (
                    <span className="text-zinc-600 ml-1">(최대 {maxChars.toLocaleString()}자)</span>
                  )}
                </label>
                <div className="relative">
                  <textarea
                    placeholder="하고 싶은 말을 자유롭게 적어주세요."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    maxLength={maxChars || undefined}
                    rows={activeTier.tier === 'lunch' ? 8 : 4}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500 resize-none"
                  />
                  {maxChars > 0 && (
                    <span className={`absolute bottom-2 right-3 text-xs ${
                      message.length >= maxChars ? 'text-red-400' : 'text-zinc-600'
                    }`}>
                      {message.length.toLocaleString()} / {maxChars.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleSend}
                disabled={sending || !message.trim() || (activeTier.tier === 'free' && !freeAmount)}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sending ? '전송 중...' : '메시지 보내기'}
              </button>

              {result === 'success' && (
                <p className="text-sm text-emerald-400 text-center">
                  ✓ 메시지가 전달됐습니다. 정말 감사합니다!
                </p>
              )}
              {result === 'error' && (
                <p className="text-sm text-red-400 text-center">{errorMsg}</p>
              )}
            </div>
          )}

          <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors text-center">
            ← 홈으로 돌아가기
          </Link>
        </div>
      </main>
    )
  }

  // ── 일반 화면 (후원 전) ────────────────────────────────
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-2xl mx-auto px-6 py-16 flex flex-col gap-12">

        {/* 헤더 */}
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

        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '입장료', value: '$0' },
            { label: '구독료', value: '$0' },
            { label: '광고', value: '없음' },
          ].map(stat => (
            <div key={stat.label} className="bg-zinc-900 rounded-xl px-4 py-5 flex flex-col items-center gap-1">
              <span className="text-2xl font-bold text-white">{stat.value}</span>
              <span className="text-xs text-zinc-500">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* 설명 */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <p className="text-zinc-400 text-sm leading-relaxed">
              솔직히 말하면, 딱히 불쌍하지 않아요. 서버 터지면 그냥 껐다 켜고, 데이터 빠지면 조용히 복구하고.
              그래도 가끔 커피 한 잔 사주시면 밤새 업데이트할 의욕이 생기긴 합니다.
            </p>
          </CardContent>
        </Card>

        {/* 티어 선택 */}
        <div className="flex flex-col gap-4">
          <p className="text-sm text-zinc-500">
            티어를 선택하면 BMC 페이지로 이동합니다. 후원 완료 후 메시지를 보낼 수 있어요.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {tiers.map((tier, i) => (
              <button
                key={i}
                onClick={() => setSelected(i === selected ? null : i)}
                className={`bg-zinc-900 border rounded-xl p-5 flex flex-col gap-2 text-left transition-all ${
                  selected === i ? 'border-white' : 'border-zinc-700 hover:border-zinc-500'
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

          {/* Free tier 금액 입력 */}
          {selected !== null && tiers[selected].tier === 'free' && (
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 text-sm">$</span>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="금액 입력"
                value={freeAmount}
                onChange={e => setFreeAmount(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white w-28 focus:outline-none focus:border-zinc-500"
              />
              {Number(freeAmount) > 0 && (
                <span className="text-xs text-zinc-500">
                  → 후원 완료 후 최대 {calcFreeMaxChars(Number(freeAmount)).toLocaleString()}자 메시지 가능
                </span>
              )}
            </div>
          )}
        </div>

        {/* CTA 버튼 */}
        <button
          onClick={handleBmcClick}
          disabled={selected === null || (tiers[selected ?? 0]?.tier === 'free' && !freeAmount)}
          className="w-full flex items-center justify-center gap-2 bg-white text-zinc-950 hover:bg-zinc-100 transition-colors font-semibold py-4 rounded-xl text-base disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {selected === null
            ? '티어를 먼저 선택해주세요'
            : `${tiers[selected].emoji} Buy Me a Coffee로 후원하기 →`}
        </button>

        {/* 체크리스트 */}
        <ul className="flex flex-col gap-2">
          {[
            '완전 자발적입니다',
            '반복 결제 없음',
            '후원 완료 후 메시지를 보낼 수 있어요',
          ].map(item => (
            <li key={item} className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="text-zinc-500">✓</span>
              {item}
            </li>
          ))}
        </ul>

        {/* 푸터 */}
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
