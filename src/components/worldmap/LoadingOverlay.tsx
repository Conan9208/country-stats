'use client'

type Props = {
  isReady: boolean
  message: string
}

export function LoadingOverlay({ isReady, message }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 900,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(9,9,11,0.55)',
        backdropFilter: 'blur(2px)',
        opacity: isReady ? 0 : 1,
        pointerEvents: isReady ? 'none' : 'all',
        transition: 'opacity 0.5s ease',
      }}
    >
      <div className="globe-spinner" />
      <div style={{ fontSize: 13, color: '#64748b', marginTop: 12 }}>🌍 {message}</div>
    </div>
  )
}
