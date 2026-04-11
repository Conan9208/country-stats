'use client'

import { useState } from 'react'
import { Link2, Flag, X } from 'lucide-react'
import { glass } from '@/lib/mapConstants'
import type { GlobePin } from '@/types/pin'
import { useTranslations } from 'next-intl'

type Props = {
  countryName: string
  pins: GlobePin[]
  x: number
  y: number
  onClose: () => void
  onAddPin: () => void
}

function getDaysLeft(expiresAt: string): number {
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export default function PromoListPanel({ countryName, pins, x, y, onClose, onAddPin }: Props) {
  const t = useTranslations('Pin')
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set())

  async function handleReport(id: string) {
    await fetch(`/api/pins/${id}/report`, { method: 'POST' })
    setReportedIds(prev => new Set(prev).add(id))
  }

  // 화면 가장자리 보정 (maxHeight는 뷰포트 높이의 65% 이하)
  const panelW = 280
  const winH = typeof window !== 'undefined' ? window.innerHeight : 800
  const winW = typeof window !== 'undefined' ? window.innerWidth : 1200
  const maxPanelH = Math.min(Math.floor(winH * 0.65), 520)
  const panelH = Math.min(pins.length * 94 + 120, maxPanelH)
  const left = Math.min(x + 12, winW - panelW - 12)
  const top  = Math.min(y - 10, winH - panelH - 12)

  return (
    <div
      style={{
        position: 'fixed', left: Math.max(8, left), top: Math.max(8, top),
        zIndex: 2500, ...glass, borderRadius: 14,
        padding: '14px 14px 10px', width: panelW,
        boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
        pointerEvents: 'all', maxHeight: maxPanelH, display: 'flex', flexDirection: 'column',
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{countryName}</span>
          <span style={{ fontSize: 11, color: '#64748b', marginLeft: 6 }}>
            {t('promoCount', { count: pins.length })}
          </span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center' }}><X size={14} /></button>
      </div>

      {/* 핀 카드 리스트 */}
      <div style={{
        flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8,
        paddingRight: 2, // 스크롤바 여백
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(167,139,250,0.3) transparent',
      } as React.CSSProperties}>
        {pins.map(pin => (
          <div
            key={pin.id}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: '10px 10px 8px',
            }}
          >
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              {/* 로고 */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                overflow: 'hidden', background: 'rgba(167,139,250,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid rgba(167,139,250,0.3)',
              }}>
                {pin.logo_url
                  ? <img src={pin.logo_url} alt={pin.business_name} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 14, fontWeight: 700, color: '#a78bfa' }}>
                      {pin.business_name.charAt(0).toUpperCase()}
                    </span>
                }
              </div>

              {/* 사업명 + 소개 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                    {pin.business_name}
                  </div>
                  {pin.expires_at && (() => {
                    const d = getDaysLeft(pin.expires_at)
                    const color = d <= 1 ? '#f87171' : d <= 2 ? '#fb923c' : '#64748b'
                    return (
                      <span style={{ fontSize: 9, fontWeight: 700, color, background: `${color}22`, borderRadius: 4, padding: '1px 5px', flexShrink: 0, letterSpacing: '0.03em' }}>
                        D-{d}
                      </span>
                    )
                  })()}
                </div>
                {pin.description && (
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pin.description}
                  </div>
                )}
              </div>
            </div>

            {/* URL + 신고 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              {pin.website_url
                ? <a
                    href={pin.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 11, color: '#a78bfa',
                      background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)',
                      borderRadius: 6, padding: '3px 8px',
                      textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <Link2 size={10} /> {t('visitSite')}
                  </a>
                : <span />
              }
              <button
                onClick={() => handleReport(pin.id)}
                disabled={reportedIds.has(pin.id)}
                style={{
                  background: 'none', border: 'none', cursor: reportedIds.has(pin.id) ? 'default' : 'pointer',
                  color: reportedIds.has(pin.id) ? '#475569' : '#f87171', fontSize: 11, padding: '2px 4px',
                }}
              >
                {reportedIds.has(pin.id) ? t('reported') : <Flag size={11} />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 핀 추가 버튼 */}
      <button
        onClick={onAddPin}
        style={{
          marginTop: 10, width: '100%',
          background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)',
          borderRadius: 9, color: '#a78bfa', fontSize: 12, fontWeight: 600, padding: '8px 0',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        + {t('addPromo', { country: countryName })}
      </button>
    </div>
  )
}
