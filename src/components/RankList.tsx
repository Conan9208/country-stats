'use client'

import { useEffect, useRef, useState } from 'react'
import { TIERS } from '@/lib/mapConstants'
import { Medal } from 'lucide-react'
import { formatCount } from '@/lib/mapUtils'

export type RankEntry = { alpha2: string; name: string; count: number }

type RankFloat = { id: string; alpha2: string; delta: number }

export default function RankList({ title, entries, emptyMsg, live, onSelect, visibleCount = 20 }: {
  title: string
  entries: RankEntry[]
  emptyMsg: string
  live?: boolean
  onSelect: (c: { code: string; name: string }) => void
  visibleCount?: number
}) {
  const max = entries[0]?.count ?? 1
  const listMaxHeight = visibleCount * 30

  const prevEntriesRef = useRef<RankEntry[]>([])
  const [rankFloats, setRankFloats] = useState<RankFloat[]>([])

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    const prev = prevEntriesRef.current
    if (prev.length > 0) {
      const newFloats: RankFloat[] = []
      entries.slice(0, visibleCount).forEach((entry, newIdx) => {
        const prevIdx = prev.findIndex(e => e.alpha2 === entry.alpha2)
        if (prevIdx === -1) {
          newFloats.push({ id: `${entry.alpha2}-${Date.now()}`, alpha2: entry.alpha2, delta: 0 })
        } else if (prevIdx > newIdx) {
          newFloats.push({ id: `${entry.alpha2}-${Date.now()}`, alpha2: entry.alpha2, delta: prevIdx - newIdx })
        }
      })
      if (newFloats.length > 0) {
        timers.push(setTimeout(() => {
          setRankFloats(prev => [...prev, ...newFloats])
          newFloats.forEach(f => {
            timers.push(setTimeout(() => setRankFloats(p => p.filter(x => x.id !== f.id)), 1000))
          })
        }, 0))
      }
    }
    prevEntriesRef.current = [...entries]
    return () => { timers.forEach(clearTimeout) }
  }, [entries, visibleCount])

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
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: listMaxHeight, overflowY: 'auto', paddingRight: 14, marginRight: -4, scrollbarWidth: 'thin', scrollbarColor: 'rgba(99,102,241,0.3) transparent', overscrollBehavior: 'contain' }}>
          {entries.map((e, i) => {
            const tier = TIERS.find(t => e.count >= t.min && e.count <= t.max)
            const floats = rankFloats.filter(f => f.alpha2 === e.alpha2)
            return (
              <li key={e.alpha2} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {i < 3
                    ? <Medal size={13} style={{ color: ['#facc15','#94a3b8','#cd7f32'][i] }} />
                    : <span style={{ fontSize: 11, color: '#475569' }}>{i + 1}</span>}
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
                {floats.map(f => (
                  <span
                    key={f.id}
                    className={f.delta === 0 ? 'float-rank float-rank--new' : 'float-rank'}
                    style={{ left: 0, top: 0 }}
                  >
                    {f.delta === 0 ? 'NEW' : `↑${f.delta}`}
                  </span>
                ))}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
