'use client'

export type ContextMenuAction = 'info' | 'comment' | 'promote' | 'travel'

type Props = {
  menu: { x: number; y: number; alpha2: string; name: string }
  onSelect: (action: ContextMenuAction, alpha2: string, name: string) => void
  labels: Record<ContextMenuAction, string>
}

const ACTIONS: ContextMenuAction[] = ['info', 'comment', 'promote', 'travel']

export function GlobeContextMenu({ menu, onSelect, labels }: Props) {
  return (
    <div
      onMouseDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
      className="glass-panel"
      style={{
        position: 'fixed',
        left: menu.x,
        top: menu.y,
        zIndex: 2000,
        borderRadius: 12,
        padding: '6px 0',
        minWidth: 200,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{ fontSize: 11, color: '#475569', padding: '6px 14px 4px', fontWeight: 700, letterSpacing: '0.06em' }}>
        {menu.name}
      </div>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '4px 0' }} />
      {ACTIONS.map(action => (
        <button
          key={action}
          className="context-menu-item"
          onClick={() => onSelect(action, menu.alpha2, menu.name)}
        >
          {labels[action]}
        </button>
      ))}
    </div>
  )
}
