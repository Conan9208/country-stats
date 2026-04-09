'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

const KOFI_BASE = 'https://ko-fi.com/conankor'

function calcFreeMaxChars(amount: number): number {
  if (amount < 3)  return 50
  if (amount < 10) return 100
  if (amount < 30) return 1000
  return Math.min(5000, Math.floor(amount * 100))
}

export default function DonatePage() {
  const t = useTranslations('Donate')

  const tiers = [
    {
      emoji: '☕',
      amount: '$3',
      numericAmount: 3,
      label: t('tierCoffeeLabel'),
      desc: t('tierCoffeeDesc'),
      tier: 'coffee' as const,
      maxChars: 100,
    },
    {
      emoji: '🍜',
      amount: '$10',
      numericAmount: 10,
      label: t('tierLunchLabel'),
      desc: t('tierLunchDesc'),
      tier: 'lunch' as const,
      maxChars: 1000,
    },
    {
      emoji: '💸',
      amount: t('tierFreeAmount'),
      numericAmount: null,
      label: t('tierFreeLabel'),
      desc: t('tierFreeDesc'),
      tier: 'free' as const,
      maxChars: null,
    },
  ]

  // 후원 후 메시지 입력 화면 표시
  const [showThanks, setShowThanks] = useState(false)
  const [returnedTierIdx, setReturnedTierIdx] = useState<number | null>(null)

  // 일반 선택 상태 (후원 전)
  const [selected, setSelected] = useState<number | null>(null)
  const [freeAmount, setFreeAmount] = useState('')

  // Ko-fi 창이 열렸는지 (메시지 남기기 버튼 표시 여부)
  const [kofiOpened, setKofiOpened] = useState(false)

  // 메시지 전송
  const [senderName, setSenderName] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<'success' | 'error' | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const savedTier = sessionStorage.getItem('kofi_tier')
    if (savedTier) {
      const idx = tiers.findIndex(t => t.tier === savedTier)
      if (idx !== -1) setReturnedTierIdx(idx)
    }
    const savedAmount = sessionStorage.getItem('kofi_amount')
    if (savedAmount) setFreeAmount(savedAmount)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeTierIdx = showThanks ? returnedTierIdx : selected
  const activeTier = activeTierIdx !== null ? tiers[activeTierIdx] : null

  const maxChars = (() => {
    if (!activeTier) return 0
    if (activeTier.tier === 'free') return calcFreeMaxChars(Number(freeAmount) || 0)
    return activeTier.maxChars ?? 0
  })()

  function handleKofiClick() {
    if (selected === null) return
    const tier = tiers[selected]
    let url = KOFI_BASE
    if (tier.tier === 'coffee') url += '?amount=3'
    else if (tier.tier === 'lunch') url += '?amount=10'
    else if (tier.tier === 'free' && freeAmount) url += `?amount=${freeAmount}`

    sessionStorage.setItem('kofi_tier', tier.tier)
    if (tier.tier === 'free' && freeAmount) sessionStorage.setItem('kofi_amount', freeAmount)
    else sessionStorage.removeItem('kofi_amount')

    window.open(url, '_blank')
    setKofiOpened(true)
  }

  function handleShowThanks() {
    const savedTier = sessionStorage.getItem('kofi_tier')
    const idx = tiers.findIndex(t => t.tier === savedTier)
    if (idx !== -1) setReturnedTierIdx(idx)
    const savedAmount = sessionStorage.getItem('kofi_amount')
    if (savedAmount) setFreeAmount(savedAmount)
    setShowThanks(true)
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
        sessionStorage.removeItem('kofi_tier')
        sessionStorage.removeItem('kofi_amount')
      } else {
        setResult('error')
        setErrorMsg(data.error ?? t('errorDefault'))
      }
    } catch {
      setResult('error')
      setErrorMsg(t('errorNetwork'))
    } finally {
      setSending(false)
    }
  }

  // ── 후원 완료 후 메시지 화면 ──────────────────────────────
  if (showThanks) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="max-w-2xl mx-auto px-6 py-16 flex flex-col gap-8">

          <div className="flex flex-col gap-3">
            <div className="text-4xl">🎉</div>
            <h1 className="text-3xl font-bold leading-tight">{t('thanksTitle')}</h1>
            <p className="text-zinc-400 text-base">
              {activeTier
                ? t('thanksSubWithTier', { emoji: activeTier.emoji, label: activeTier.label })
                : t('thanksSub')}
            </p>
          </div>

          {/* 티어 미인식 시 수동 선택 */}
          {!activeTier && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-zinc-500">{t('tierQuestion')}</p>
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

              {activeTier.tier === 'free' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-400">{t('amountLabel')}</label>
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
                        → {t('maxChars', { n: calcFreeMaxChars(Number(freeAmount)).toLocaleString() })}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">{t('nameLabel')}</label>
                <input
                  type="text"
                  placeholder={t('namePlaceholder')}
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  maxLength={50}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">
                  {t('msgLabel')}
                  {maxChars > 0 && (
                    <span className="text-zinc-600 ml-1">({t('maxChars', { n: maxChars.toLocaleString() })})</span>
                  )}
                </label>
                <div className="relative">
                  <textarea
                    placeholder={t('msgPlaceholder')}
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
                {sending ? t('sending') : t('sendBtn')}
              </button>

              {result === 'success' && (
                <p className="text-sm text-emerald-400 text-center">{t('sendSuccess')}</p>
              )}
              {result === 'error' && (
                <p className="text-sm text-red-400 text-center">{errorMsg}</p>
              )}
            </div>
          )}

          <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors text-center">
            {t('backHome')}
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
              {t('badge')}
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight">
            {t('heading1')}
            <br />
            {t('heading2')}
          </h1>
          <p className="text-zinc-400 text-base leading-relaxed">{t('subtext')}</p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t('statEntry'), value: '$0' },
            { label: t('statSub'), value: '$0' },
            { label: t('statAd'), value: t('statAdValue') },
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
            <p className="text-zinc-400 text-sm leading-relaxed">{t('cardText')}</p>
          </CardContent>
        </Card>

        {/* 티어 선택 */}
        <div className="flex flex-col gap-4">
          <p className="text-sm text-zinc-500">{t('tierHint')}</p>
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

          {/* Free tier 금액 입력 — 개선된 UI */}
          {selected !== null && tiers[selected].tier === 'free' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-3">
              <p className="text-xs text-zinc-500 uppercase tracking-widest">{t('freeAmountLabel')}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-zinc-500">$</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="0"
                  value={freeAmount}
                  onChange={e => setFreeAmount(e.target.value)}
                  className="text-4xl font-bold text-white bg-transparent w-36 focus:outline-none placeholder-zinc-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="h-px bg-zinc-800" />
              {Number(freeAmount) > 0 ? (
                <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block flex-shrink-0" />
                  {t('freeAmountChars', { n: calcFreeMaxChars(Number(freeAmount)).toLocaleString() })}
                </p>
              ) : (
                <p className="text-xs text-zinc-600">{t('freeAmountHint')}</p>
              )}
            </div>
          )}
        </div>

        {/* CTA 버튼 */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleKofiClick}
            disabled={selected === null || (tiers[selected ?? 0]?.tier === 'free' && !freeAmount)}
            className="w-full flex items-center justify-center gap-2 bg-white text-zinc-950 hover:bg-zinc-100 transition-colors font-semibold py-4 rounded-xl text-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {selected === null
              ? t('ctaSelect')
              : t('ctaKofi', { emoji: tiers[selected].emoji })}
          </button>

          {kofiOpened && (
            <button
              onClick={handleShowThanks}
              className="w-full py-3 rounded-xl font-semibold text-sm border border-zinc-700 hover:border-zinc-500 transition-all text-zinc-300"
            >
              {t('ctaDone')}
            </button>
          )}
        </div>

        {/* 체크리스트 */}
        <ul className="flex flex-col gap-2">
          {([t('check1'), t('check2'), t('check3')] as string[]).map(item => (
            <li key={item} className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="text-zinc-500">✓</span>
              {item}
            </li>
          ))}
        </ul>

        {/* 푸터 */}
        <div className="flex flex-col gap-4 items-center text-center">
          <p className="text-zinc-600 text-sm">{t('footer')}</p>
          <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            {t('backHome')}
          </Link>
        </div>

      </div>
    </main>
  )
}
