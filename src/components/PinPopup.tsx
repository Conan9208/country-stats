'use client'

import { useState } from 'react'
import { glass } from '@/lib/mapConstants'
import type { GlobePin } from '@/types/pin'
import { useTranslations } from 'next-intl'

type Props = {
  pin: GlobePin
  x: number
  y: number
  onClose: () => void
}

export default function PinPopup({ pin, x, y, onClose }: Props) {
  const t = useTranslations('Pin')
  const [reported, setReported] = useState(false)

  async function handleReport() {
    await fetch(`/api/pins/${pin.id}/report`, { method: 'POST' })
    setReported(true)
  }

  // 화면 가장자리 보정 (우측/하단)
  const left = Math.min(x + 12, typeof window !== 'undefined' ? window.innerWidth - 240 : x)
  const top  = Math.min(y - 10, typeof window !== 'undefined' ? window.innerHeight - 140 : y)

  return (
    <div
      style={{
        position: 'fixed',
        left,
        top,
        zIndex: 2500,
        ...glass,
        borderRadius: 14,
        padding: '12px 14px',
        width: 220,
        boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
        pointerEvents: 'all',
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* 이모지 + 메시지 */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.2 }}>{pin.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, color: '#e2e8f0', margin: 0, wordBreak: 'break-word', lineHeight: 1.45 }}>
            {pin.message}
          </p>
          {pin.link_url && (
            <a
              href={pin.link_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 11, color: '#7dd3fc', marginTop: 6, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              🔗 {pin.link_url}
            </a>
          )}
        </div>
      </div>

      {/* 날짜 + 신고 + 닫기 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <span style={{ fontSize: 10, color: '#334155' }}>
          {new Date(pin.created_at).toLocaleDateString()}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={handleReport}
            disabled={reported}
            title={t('report')}
            style={{ background: 'none', border: 'none', color: reported ? '#475569' : '#f87171', cursor: reported ? 'default' : 'pointer', fontSize: 11, padding: '2px 4px' }}
          >
            {reported ? t('reported') : '🚩'}
          </button>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 13, padding: '2px 4px', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
