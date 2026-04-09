'use client'

import { useState } from 'react'
import { glass } from '@/lib/mapConstants'
import { useTranslations } from 'next-intl'

const EMOJIS = ['📍', '❤️', '🌟', '🔥', '👋', '🎉', '💬', '🏳️', '🌸', '⚡']
const MAX_MSG = 100

type Props = {
  countryName: string
  countryAlpha2: string
  onClose: () => void
  onSuccess: (shareText: string) => void
}

export default function PinSubmitModal({ countryName, countryAlpha2, onClose, onSuccess }: Props) {
  const t = useTranslations('Pin')
  const [message, setMessage] = useState('')
  const [emoji, setEmoji] = useState('📍')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit() {
    if (!message.trim()) return
    setStatus('submitting')
    setErrorMsg('')

    const res = await fetch('/api/pins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country_alpha2: countryAlpha2, message: message.trim(), emoji }),
    })

    if (res.status === 429) {
      setErrorMsg(t('rateLimitError'))
      setStatus('error')
      return
    }
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setErrorMsg(json.error ?? t('genericError'))
      setStatus('error')
      return
    }

    setStatus('done')
    const shareText = t('shareText', { country: countryName })
    onSuccess(shareText)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ ...glass, borderRadius: 16, padding: 24, width: 340, maxWidth: '90vw', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>{t('title')}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{countryName}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>

        {status !== 'done' ? (
          <>
            {/* 이모지 선택 */}
            <div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' }}>{t('emojiLabel')}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    style={{
                      fontSize: 20,
                      padding: '4px 6px',
                      borderRadius: 8,
                      border: emoji === e ? '2px solid #a78bfa' : '2px solid transparent',
                      background: emoji === e ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.04)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* 메시지 */}
            <div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' }}>{t('messageLabel')}</div>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value.slice(0, MAX_MSG))}
                placeholder={t('messagePlaceholder', { country: countryName })}
                rows={3}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  color: '#e2e8f0',
                  fontSize: 13,
                  padding: '10px 12px',
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
              <div style={{ fontSize: 11, color: message.length >= MAX_MSG ? '#f87171' : '#475569', textAlign: 'right', marginTop: 2 }}>
                {message.length} / {MAX_MSG}
              </div>
            </div>

            {/* 에러 */}
            {status === 'error' && (
              <div style={{ fontSize: 12, color: '#f87171', background: 'rgba(248,113,113,0.1)', borderRadius: 8, padding: '8px 12px' }}>
                {errorMsg}
              </div>
            )}

            {/* 안내 */}
            <div style={{ fontSize: 11, color: '#334155' }}>{t('notice')}</div>

            {/* 등록 버튼 */}
            <button
              onClick={handleSubmit}
              disabled={!message.trim() || status === 'submitting'}
              style={{
                background: message.trim() && status !== 'submitting' ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${message.trim() && status !== 'submitting' ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 10,
                color: message.trim() && status !== 'submitting' ? '#a78bfa' : '#334155',
                fontSize: 14,
                fontWeight: 600,
                padding: '10px 0',
                cursor: message.trim() && status !== 'submitting' ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
            >
              {status === 'submitting' ? t('submitting') : t('submit')}
            </button>
          </>
        ) : (
          /* 성공 화면 */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 40 }}>{emoji}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', textAlign: 'center' }}>{t('successTitle')}</div>
            <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>{t('successDesc', { country: countryName })}</div>
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <button
                onClick={() => {
                  const text = t('shareText', { country: countryName })
                  const url = typeof window !== 'undefined' ? window.location.href : ''
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text + '\n' + url)}`, '_blank')
                }}
                style={{ flex: 1, background: 'rgba(29,161,242,0.15)', border: '1px solid rgba(29,161,242,0.3)', borderRadius: 10, color: '#7dd3fc', fontSize: 13, fontWeight: 600, padding: '9px 0', cursor: 'pointer' }}
              >
                𝕏 {t('shareBtn')}
              </button>
              <button
                onClick={onClose}
                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#94a3b8', fontSize: 13, fontWeight: 600, padding: '9px 0', cursor: 'pointer' }}
              >
                {t('close')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
