'use client'
import { Link2 } from 'lucide-react'

type Props = {
  tooltip: { name: string; website?: string; x: number; y: number }
  detailsLabel: string
}

export function PinHoverTooltip({ tooltip, detailsLabel }: Props) {
  return (
    <div
      className="glass-panel"
      style={{
        position: 'absolute',
        left: tooltip.x + 14,
        top: tooltip.y - 10,
        zIndex: 1500,
        pointerEvents: 'none',
        borderRadius: 10,
        padding: '7px 12px',
        maxWidth: 220,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {tooltip.name}
      </div>
      {tooltip.website && (
        <div style={{ fontSize: 10, color: '#a78bfa', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <Link2 size={10} style={{ verticalAlign: 'middle', marginRight: 3, flexShrink: 0 }} />
          {tooltip.website.replace(/^https?:\/\//, '')}
        </div>
      )}
      <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>{detailsLabel}</div>
    </div>
  )
}
