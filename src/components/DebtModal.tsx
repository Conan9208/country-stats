'use client'

import { useEffect, useRef, useState } from 'react'
import { glass } from '@/lib/mapConstants'

type DebtData = {
  code: string
  name: string
  flag: string
  currency: { code: string; symbol: string; name: string } | null
  gdpUSD: number
  gdpYear: string
  debtRatio: number
  debtYear: string
  interestRate: number
  interestYear: string | null
  totalDebtUSD: number
  perSecondUSD: number
  localDebt: number | null
  perSecondLocal: number | null
  exchangeRate: number | null
}

function formatUSD(n: number) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(3)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toFixed(0)}`
}

function TickerNumber({ base, perSecond, symbol }: { base: number; perSecond: number; symbol: string }) {
  const rafRef   = useRef<number>(0)
  // eslint-disable-next-line react-hooks/purity
  const startRef = useRef(performance.now())
  const elRef    = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    startRef.current = performance.now()
    const tick = (now: number) => {
      const elapsed = (now - startRef.current) / 1000
      const val = base + elapsed * perSecond
      if (elRef.current) {
        elRef.current.textContent =
          symbol + ' ' + val.toLocaleString('en-US', { maximumFractionDigits: 0 })
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [base, perSecond, symbol])

  return (
    <span
      ref={elRef}
      style={{ fontFamily: '"Courier New", Consolas, monospace', fontVariantNumeric: 'tabular-nums' }}
    >
      {symbol} {base.toLocaleString('en-US')}
    </span>
  )
}

type Props = { code: string; name: string; onClose: () => void }

export default function DebtModal({ code, name, onClose }: Props) {
  const [data,    setData]    = useState<DebtData | null>(null)
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true); setError(null); setData(null)
    fetch(`/api/country/${code}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(() => setError('데이터를 불러오지 못했어요'))
      .finally(() => setLoading(false))
  }, [code])

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ ...glass, borderRadius: 20, width: 520, maxHeight: '85vh', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(99,102,241,0.3) transparent' }}
      >
        {/* 헤더 */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'rgba(9,9,11,0.95)', borderRadius: '20px 20px 0 0' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{data?.name ?? name}</div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>국가 부채 실시간 추산</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#64748b', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ padding: '24px' }}>
          {loading && <div style={{ textAlign: 'center', color: '#334155', padding: '40px 0' }}>데이터를 불러오는 중...</div>}

          {error && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
              <div style={{ color: '#f87171', fontSize: 14 }}>{error}</div>
              <div style={{ color: '#334155', fontSize: 12, marginTop: 6 }}>World Bank에 해당 국가의 부채 데이터가 없어요</div>
            </div>
          )}

          {data && (
            <>
              {/* 메인 티커 */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '24px 20px', marginBottom: 16, textAlign: 'center' }}>
                {data.localDebt && data.perSecondLocal && data.currency ? (
                  <>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>{data.currency.name} ({data.currency.code})</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#f1f5f9', lineHeight: 1.1 }}>
                      <TickerNumber base={data.localDebt} perSecond={data.perSecondLocal} symbol={data.currency.symbol} key={`local-${code}`} />
                    </div>
                    <div style={{ margin: '10px 0 6px', fontSize: 12, color: '#334155' }}>≈</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>US Dollar (USD)</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#60a5fa' }}>
                      <TickerNumber base={data.totalDebtUSD} perSecond={data.perSecondUSD} symbol="$" key={`usd-${code}`} />
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#f1f5f9' }}>
                    <TickerNumber base={data.totalDebtUSD} perSecond={data.perSecondUSD} symbol="$" key={`usd-only-${code}`} />
                  </div>
                )}
              </div>

              {/* 스탯 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                {[
                  { label: 'GDP', value: formatUSD(data.gdpUSD), sub: `${data.gdpYear}년`, color: '#a78bfa' },
                  { label: '부채 / GDP', value: `${data.debtRatio.toFixed(1)}%`, sub: `${data.debtYear}년`, color: data.debtRatio > 100 ? '#f87171' : data.debtRatio > 60 ? '#fb923c' : '#4ade80' },
                  { label: '연 이자율', value: `${data.interestRate.toFixed(1)}%`, sub: data.interestYear ? `${data.interestYear}년 실질금리` : '기본값', color: '#60a5fa' },
                  { label: '초당 이자', value: data.currency && data.perSecondLocal ? `${data.currency.symbol}${data.perSecondLocal.toLocaleString('en-US', { maximumFractionDigits: 1 })}` : `$${data.perSecondUSD.toFixed(2)}`, sub: `≈ $${data.perSecondUSD.toFixed(2)}/s`, color: '#f472b6' },
                ].map(c => (
                  <div key={c.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 16px' }}>
                    <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{c.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: c.color, fontVariantNumeric: 'tabular-nums' }}>{c.value}</div>
                    <div style={{ fontSize: 10, color: '#334155', marginTop: 3 }}>{c.sub}</div>
                  </div>
                ))}
              </div>

              {data.exchangeRate && data.currency && (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '8px 16px', display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: 11, color: '#475569' }}>환율 기준</span>
                  <span style={{ fontSize: 12, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>1 USD = {data.exchangeRate.toLocaleString('en-US', { maximumFractionDigits: 2 })} {data.currency.code}</span>
                </div>
              )}

              <div style={{ fontSize: 10, color: '#1e293b', textAlign: 'center', lineHeight: 1.8 }}>
                World Bank Open Data · open.er-api.com · 추산 수치, 실제와 다를 수 있음
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
