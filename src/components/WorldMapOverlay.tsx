'use client'


import { forwardRef, useImperativeHandle, useState } from 'react'
import type { TooltipState } from '@/types/map'
import { getLocalTime } from '@/lib/timezoneData'
import { formatCount, getTier } from '@/lib/mapUtils'
import { flagEmoji } from '@/lib/geoData'
import { glass } from '@/lib/mapConstants'
import { useTranslations } from 'next-intl'

export interface RouletteSlotData {
  current: { alpha2: string; name: string }
  phase: 'cycling' | 'landing'
}

export interface LandingFactsData {
  population: number
  area: number
  region: string
  capital: string
  popRank: number
  areaRank: number
  funFact: string
}

export interface FloatNumData {
  id: number
  x: number
  y: number
  value: number
  isRateLimit?: boolean
}

export interface OverlayHandle {
  setTooltip: (t: TooltipState | null) => void;
  addFloatNum: (id: number, x: number, y: number, value: number) => void;
  rateLimitFloatNum: (id: number) => void;
  removeFloatNum: (id: number) => void;
  setRouletteSlot: (slot: RouletteSlotData | null) => void;
  setLandingFacts: (facts: LandingFactsData | null) => void;
  setToast: (toast: { message: string, sub: string } | null) => void;
}

export const WorldMapOverlay = forwardRef<OverlayHandle>((props, ref) => {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [floatNums, setFloatNums] = useState<FloatNumData[]>([])
  const [rouletteSlot, setRouletteSlot] = useState<RouletteSlotData | null>(null)
  const [landingFacts, setLandingFacts] = useState<LandingFactsData | null>(null)
  const [toast, setToast] = useState<{ message: string; sub: string } | null>(null)
  const t = useTranslations('Map')

  useImperativeHandle(ref, () => ({
    setTooltip,
    addFloatNum: (id, x, y, value) => setFloatNums(prev => [...prev, { id, x, y, value, isRateLimit: false }]),
    rateLimitFloatNum: (id) => setFloatNums(prev => prev.map(n => n.id === id ? { ...n, isRateLimit: true } : n)),
    removeFloatNum: (id) => setFloatNums(prev => prev.filter(n => n.id !== id)),
    setRouletteSlot,
    setLandingFacts,
    setToast,
  }))

  return (
    <>
      {/* 슬롯머신 오버레이 — cycling 중에만 표시 */}
      {rouletteSlot?.phase === 'cycling' && (
        <div style={{
          position: 'absolute',
          top: '38%',
          left: 'calc(50% - 128px)',
          transform: 'translate(-50%, -50%)',
          zIndex: 1500,
          pointerEvents: 'none',
          textAlign: 'center',
        }}>
          <div style={{
            ...glass,
            borderRadius: 24,
            padding: '22px 44px',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            minWidth: 200,
          }}>
            <div style={{ fontSize: 10, color: '#334155', fontWeight: 700, letterSpacing: '0.14em', marginBottom: 14 }}>
              {t('spinTitle')}
            </div>
            <div style={{ fontSize: 48, lineHeight: 1.1, marginBottom: 10 }}>
              {flagEmoji(rouletteSlot.current.alpha2)}
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.01em' }}>
              {rouletteSlot.current.name}
            </div>
          </div>
        </div>
      )}

      {/* 팩트 카드 — landing 시 전체화면 오버레이로 표시 */}
      {rouletteSlot?.phase === 'landing' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          pointerEvents: 'none',
        }}>
          <div style={{
            ...glass,
            borderRadius: 28,
            padding: '36px 52px',
            textAlign: 'center',
            border: '1px solid rgba(167,139,250,0.55)',
            boxShadow: '0 0 80px rgba(167,139,250,0.18), 0 16px 60px rgba(0,0,0,0.7)',
            animation: 'rouletteLand 0.4s cubic-bezier(0.22,1,0.36,1)',
            minWidth: 280,
          }}>
            <div style={{ fontSize: 11, color: '#a78bfa', fontWeight: 700, letterSpacing: '0.16em', marginBottom: 16 }}>
              {t('spinResult')}
            </div>
            <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 12 }}>
              {flagEmoji(rouletteSlot.current.alpha2)}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 20, letterSpacing: '-0.01em' }}>
              {rouletteSlot.current.name}
            </div>
            {landingFacts ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'rouletteLand 0.4s 0.15s cubic-bezier(0.22,1,0.36,1) both' }}>
                <div style={{
                  background: 'rgba(167,139,250,0.08)',
                  border: '1px solid rgba(167,139,250,0.25)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  fontSize: 13,
                  color: '#e2e8f0',
                  lineHeight: 1.55,
                  textAlign: 'left',
                }}>
                  ✨ {landingFacts.funFact}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
                  {landingFacts.capital && (
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>🏛️ <strong style={{ color: '#cbd5e1' }}>{landingFacts.capital}</strong></span>
                  )}
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{t('popRank', { rank: landingFacts.popRank })}</span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{t('areaRank', { rank: landingFacts.areaRank })}</span>
                </div>
                <div style={{ fontSize: 11, color: '#475569' }}>🌍 {landingFacts.region}</div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#475569' }}>{t('loadingFacts')}</div>
            )}
          </div>
        </div>
      )}

      {/* 플로팅 피드백 */}
      {floatNums.map(n => (
        <div
          key={n.id}
          className={n.isRateLimit ? 'float-num float-num--rate-limit' : 'float-num'}
          style={{ left: n.x - 16, top: n.y - 24 }}
        >
          {n.isRateLimit ? '🚫' : `+${n.value.toLocaleString()}`}
        </div>
      ))}

      {/* 툴팁 */}
      {tooltip && (
        <div style={{
          ...glass,
          position: 'absolute',
          left: tooltip.x - 14,
          top: tooltip.y - 10,
          transform: 'translateX(-100%)',
          borderRadius: 10,
          padding: '9px 13px',
          pointerEvents: 'none',
          zIndex: 1000,
          minWidth: 130,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{tooltip.name}</div>
          {(() => {
            const lt = getLocalTime(tooltip.alpha2)
            if (!lt) return null
            return (
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                {lt.city ? t('localTime', { city: lt.city, time: lt.time }) : t('localTimeNoCity', { time: lt.time })}
              </div>
            )
          })()}
          {tooltip.count > 0
            ? <>
                <div style={{ fontSize: 11, color: '#a78bfa', marginTop: 3 }}>{t('clicks', { count: formatCount(tooltip.count) })}</div>
                <div style={{ fontSize: 11, marginTop: 2, color: getTier(tooltip.count)?.color ?? '#a78bfa' }}>
                  {getTier(tooltip.count)?.tag}
                </div>
              </>
            : <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>{t('clickToRecord')}</div>
          }
          {tooltip.viewers > 0 && (
            <div style={{ fontSize: 11, color: '#c084fc', marginTop: 3 }}>
              {t('viewers', { count: tooltip.viewers })}
            </div>
          )}
        </div>
      )}

      {/* 토스트 알림 */}
      <div style={{
        position: 'absolute',
        bottom: 40,
        left: '50%',
        transform: `translateX(-50%) translateY(${toast ? 0 : 20}px)`,
        opacity: toast ? 1 : 0,
        transition: 'opacity 0.25s ease, transform 0.25s ease',
        pointerEvents: 'none',
        zIndex: 2000,
        ...glass,
        borderRadius: 14,
        padding: '12px 20px',
        textAlign: 'center',
        minWidth: 240,
        border: '1px solid rgba(251,146,60,0.35)',
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#fb923c' }}>
          {toast?.message}
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
          {toast?.sub}
        </div>
      </div>
    </>
  )
})

WorldMapOverlay.displayName = 'WorldMapOverlay'
