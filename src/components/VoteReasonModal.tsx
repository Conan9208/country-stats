'use client'

import { useState, useEffect, useCallback } from 'react'
import isoCountries from 'i18n-iso-countries'
import localeKo from 'i18n-iso-countries/langs/ko.json'
import { glass } from '@/lib/mapConstants'

isoCountries.registerLocale(localeKo as Parameters<typeof isoCountries.registerLocale>[0])

function flagEmoji(alpha2: string): string {
  return alpha2.toUpperCase().split('').map(c =>
    String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0))
  ).join('')
}

interface Props {
  alpha2: string
  countryName: string
  onDone: () => void
}

export default function VoteReasonModal({ alpha2, countryName, onDone }: Props) {
  const [step, setStep] = useState<'reason' | 'celebration'>('reason')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [countdown, setCountdown] = useState(4)

  // 축하 화면 자동 닫기 카운트다운
  useEffect(() => {
    if (step !== 'celebration') return
    if (countdown <= 0) { onDone(); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [step, countdown, onDone])

  const handleComplete = useCallback(async () => {
    setSubmitting(true)
    if (reason.trim()) {
      await fetch('/api/polls/vote', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      })
    }
    setSubmitting(false)
    setStep('celebration')
  }, [reason])

  const overlay = (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 1200,
      background: 'rgba(5,10,16,0.72)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} />
  )

  const cardBase: React.CSSProperties = {
    ...glass,
    position: 'absolute',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 1300,
    width: 380,
    borderRadius: 24,
    padding: '36px 32px 28px',
    boxShadow: '0 0 80px rgba(167,139,250,0.15), 0 32px 80px rgba(0,0,0,0.7)',
    textAlign: 'center',
  }

  // ── 축하 화면 ──
  if (step === 'celebration') {
    return (
      <>
        {overlay}
        <div style={cardBase}>
          {/* 대형 국기 */}
          <div style={{ fontSize: 72, lineHeight: 1, marginBottom: 16, filter: 'drop-shadow(0 0 24px rgba(250,204,21,0.5))' }}>
            {flagEmoji(alpha2)}
          </div>

          {/* 타이틀 */}
          <div style={{ fontFamily: "'Pacifico', cursive", fontSize: 26, color: '#facc15', marginBottom: 8, letterSpacing: '0.02em' }}>
            투표 완료! 🎉
          </div>

          <div style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0', marginBottom: reason.trim() ? 16 : 24 }}>
            {countryName}
          </div>

          {/* 저장된 이유 (있을 때만) */}
          {reason.trim() && (
            <div style={{
              background: 'rgba(167,139,250,0.1)',
              border: '1px solid rgba(167,139,250,0.25)',
              borderRadius: 12,
              padding: '10px 16px',
              marginBottom: 20,
              fontSize: 13,
              color: '#cbd5e1',
              lineHeight: 1.6,
              fontStyle: 'italic',
            }}>
              "{reason.trim()}"
            </div>
          )}

          <div style={{ fontSize: 12, color: '#475569', marginBottom: 20 }}>
            오늘의 투표에 참여했어요 ✓
          </div>

          <button
            onClick={onDone}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 14,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#e2e8f0', fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            확인 ({countdown})
          </button>

          <div style={{ fontSize: 11, color: '#1e293b', marginTop: 10 }}>
            닫히면 일반 지구본으로 돌아가요
          </div>
        </div>
      </>
    )
  }

  // ── 이유 입력 화면 ──
  return (
    <>
      {overlay}
      <div style={cardBase}>
        {/* 국기 + 국가명 */}
        <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 10 }}>
          {flagEmoji(alpha2)}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>
          {countryName}에 투표했어요!
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 24 }}>
          선택한 이유를 남겨보세요 (선택)
        </div>

        {/* 텍스트 영역 */}
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          maxLength={200}
          rows={3}
          placeholder="이 나라를 선택한 이유를 적어보세요..."
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '12px 14px',
            color: '#e2e8f0',
            fontSize: 14, lineHeight: 1.6,
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        <div style={{ fontSize: 11, color: '#334155', textAlign: 'right', marginTop: 4, marginBottom: 20 }}>
          {reason.length} / 200자
        </div>

        {/* 버튼들 */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => { setReason(''); handleComplete() }}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 12,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#64748b', fontSize: 13, cursor: 'pointer',
            }}
          >
            건너뛰기
          </button>
          <button
            onClick={handleComplete}
            disabled={submitting}
            style={{
              flex: 2, padding: '11px 0', borderRadius: 12,
              background: reason.trim()
                ? 'linear-gradient(135deg,#7c3aed,#a855f7)'
                : 'rgba(124,58,237,0.25)',
              border: reason.trim()
                ? 'none'
                : '1px solid rgba(167,139,250,0.3)',
              color: reason.trim() ? '#fff' : '#a78bfa',
              fontSize: 13, fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
          >
            {submitting ? '저장 중…' : reason.trim() ? '💬 이유 저장하고 완료!' : '🎉 투표 완료!'}
          </button>
        </div>
      </div>
    </>
  )
}
