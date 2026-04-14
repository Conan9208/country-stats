'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import SiteHeader from '@/components/SiteHeader'

const KOFI_BASE = 'https://ko-fi.com/conankor'
const KAKAO_PAY_URL = 'https://qr.kakaopay.com/FT9kCDkwB'
const MAX_CHARS = 500

export default function DonatePage() {
  const t = useTranslations('Donate')

  const [senderName, setSenderName] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<'success' | 'error' | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSend() {
    if (!message.trim()) return
    setSending(true)
    setResult(null)
    setErrorMsg('')
    try {
      const res = await fetch('/api/donate/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: senderName.trim() || undefined,
          message: message.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult('success')
        setMessage('')
        setSenderName('')
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

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <SiteHeader />
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

        {/* 결제 버튼 */}
        <div className="flex flex-col gap-3">
          <p className="text-sm text-zinc-500">{t('tierHint')}</p>

          {/* 카카오페이 — 한국 유저 */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-zinc-600">{t('labelKorean')}</span>
            <button
              onClick={() => window.open(KAKAO_PAY_URL, '_blank')}
              className="w-full flex items-center justify-center gap-2 bg-[#FEE500] text-zinc-950 hover:bg-yellow-300 transition-colors font-semibold py-4 rounded-xl text-base"
            >
              {t('ctaKakao')}
            </button>
          </div>

          {/* Ko-fi — 해외 유저 */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-zinc-600">{t('labelGlobal')}</span>
            <button
              onClick={() => window.open(KOFI_BASE, '_blank')}
              className="w-full flex items-center justify-center gap-2 bg-white text-zinc-950 hover:bg-zinc-100 transition-colors font-semibold py-4 rounded-xl text-base"
            >
              {t('ctaKofiSimple')}
            </button>
          </div>
        </div>

        {/* 구분선 */}
        <div className="h-px bg-zinc-800" />

        {/* Leave a Note */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">{t('noteTitle')}</h2>
            <p className="text-sm text-zinc-500">{t('noteSubtext')}</p>
          </div>

          <div className="flex flex-col gap-4 border border-zinc-800 rounded-2xl p-6 bg-zinc-900">
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
                <span className="text-zinc-600 ml-1">({t('maxChars', { n: MAX_CHARS })})</span>
              </label>
              <div className="relative">
                <textarea
                  placeholder={t('msgPlaceholder')}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  maxLength={MAX_CHARS}
                  rows={4}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500 resize-none"
                />
                <span className={`absolute bottom-2 right-3 text-xs ${
                  message.length >= MAX_CHARS ? 'text-red-400' : 'text-zinc-600'
                }`}>
                  {message.length} / {MAX_CHARS}
                </span>
              </div>
            </div>

            <button
              onClick={handleSend}
              disabled={sending || !message.trim()}
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
