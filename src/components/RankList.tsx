import { TIERS } from '@/lib/mapConstants'
import { formatCount } from '@/lib/mapUtils'

export type RankEntry = { alpha2: string; name: string; count: number }

export default function RankList({ title, entries, emptyMsg, live, onSelect }: {
  title: string
  entries: RankEntry[]
  emptyMsg: string
  live?: boolean
  onSelect: (c: { code: string; name: string }) => void
}) {
  const max = entries[0]?.count ?? 1
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{title}</span>
        {live && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#22c55e', fontWeight: 600 }}>
            <span className="animate-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            LIVE
          </span>
        )}
      </div>
      {entries.length === 0 ? (
        <p style={{ color: '#334155', fontSize: 12, margin: 0 }}>{emptyMsg}</p>
      ) : (
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto', paddingRight: 14, marginRight: -4, scrollbarWidth: 'thin', scrollbarColor: 'rgba(99,102,241,0.3) transparent' }}>
          {entries.map((e, i) => {
            const tier = TIERS.find(t => e.count >= t.min && e.count <= t.max)
            return (
              <li key={e.alpha2} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 20, textAlign: 'center', fontSize: i < 3 ? 13 : 11, color: '#475569', flexShrink: 0 }}>
                  {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                    <span
                      onClick={() => onSelect({ code: e.alpha2, name: e.name })}
                      style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.2)', textUnderlineOffset: 3 }}
                    >
                      {e.name}
                    </span>
                    <span style={{ fontSize: 11, color: tier?.color ?? '#a78bfa', flexShrink: 0, marginLeft: 6, fontWeight: 600 }}>
                      {formatCount(e.count)}
                    </span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(e.count / max) * 100}%`, background: `linear-gradient(90deg, ${tier?.color ?? '#818cf8'}, #c084fc)`, borderRadius: 2 }} />
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
