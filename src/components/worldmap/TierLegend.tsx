'use client'
import { TIERS } from '@/lib/mapConstants'

type TranslateFn = (key: string) => string

type Props = {
  isMobileUI: boolean
  showPopup: boolean
  onTogglePopup: () => void
  t: TranslateFn
}

export function TierLegend({ isMobileUI, showPopup, onTogglePopup, t }: Props) {
  if (isMobileUI) {
    return (
      <div style={{ position: 'relative' }}>
        {showPopup && (
          <div
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            className="glass-panel"
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: 0,
              zIndex: 1001,
              borderRadius: 12,
              padding: '10px 14px',
              minWidth: 195,
            }}
          >
            <TierList t={t} />
          </div>
        )}
        <button
          onClick={onTogglePopup}
          onMouseDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
          className="glass-panel globe-overlay-btn"
          style={{
            borderRadius: 12,
            padding: '8px 16px',
            border: `1px solid ${showPopup ? 'rgba(167,139,250,0.6)' : 'rgba(167,139,250,0.35)'}`,
            color: showPopup ? '#c4b5fd' : '#a78bfa',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          🎖️ {t('tierButton')}
        </button>
      </div>
    )
  }
  return (
    <div className="glass-panel" style={{ borderRadius: 12, padding: '10px 14px' }}>
      <TierList t={t} />
    </div>
  )
}

function TierList({ t }: { t: TranslateFn }) {
  return (
    <>
      <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
        {t('clickTier')}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {TIERS.map((tier, tierIdx) => (
          <div key={tier.tag} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: tier.color, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: '#94a3b8', minWidth: 72, flexShrink: 0 }}>{tier.label}</span>
            <span style={{ fontSize: 10, color: tier.color, fontWeight: 600, whiteSpace: 'nowrap' }}>
              {t(`tierTag${tierIdx}`)}
            </span>
          </div>
        ))}
      </div>
    </>
  )
}
