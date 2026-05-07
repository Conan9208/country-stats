'use client'

type Props = {
  badge: { id: number; alpha2: string; name: string; count: number }
}

export function MobileTapBadge({ badge }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        pointerEvents: 'none',
      }}
    >
      <div
        key={badge.id}
        className="tap-badge glass-panel"
        style={{
          borderRadius: 16,
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          minWidth: 180,
        }}
      >
        <img
          src={`https://flagcdn.com/48x36/${badge.alpha2.toLowerCase()}.png`}
          alt=""
          style={{ width: 36, height: 27, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
        />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap' }}>{badge.name}</div>
          <div style={{ fontSize: 11, color: '#a78bfa', marginTop: 2 }}>
            👆 {badge.count.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
}
