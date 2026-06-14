'use client'

import { useState } from 'react'

export type ContextMenuAction = 'info' | 'comment' | 'promote' | 'travel'

type Props = {
  menu: { x: number; y: number; alpha2: string; name: string }
  onSelect: (action: ContextMenuAction, alpha2: string, name: string) => void
  labels: Record<ContextMenuAction, string>
}

const ACTIONS: ContextMenuAction[] = ['info', 'comment', 'promote', 'travel']

// 인라인 스타일 사용 — 지구본 오버레이는 외부 CSS 클래스 의존 시 깨지기 쉬워
// (Tailwind v4 layer/캐시 이슈) 레이아웃 스타일을 직접 지정한다. (CLAUDE.md 컨벤션)
export function GlobeContextMenu({ menu, onSelect, labels }: Props) {
  const [hovered, setHovered] = useState<ContextMenuAction | null>(null)

  return (
    <div
      onMouseDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: menu.x,
        top: menu.y,
        zIndex: 2000,
        borderRadius: 12,
        padding: '6px 0',
        minWidth: 200,
        background: 'rgba(9, 9, 11, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ fontSize: 11, color: '#94a3b8', padding: '6px 14px 4px', fontWeight: 700, letterSpacing: '0.06em' }}>
        {menu.name}
      </div>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '4px 0' }} />
      {ACTIONS.map(action => (
        <button
          key={action}
          onClick={() => onSelect(action, menu.alpha2, menu.name)}
          onMouseEnter={() => setHovered(action)}
          onMouseLeave={() => setHovered(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            textAlign: 'left',
            background: hovered === action ? 'rgba(255,255,255,0.08)' : 'transparent',
            border: 0,
            color: '#e2e8f0',
            fontSize: 13,
            lineHeight: 1.4,
            padding: '8px 14px',
            cursor: 'pointer',
            transition: 'background 0.12s ease',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
        >
          {labels[action]}
        </button>
      ))}
    </div>
  )
}
