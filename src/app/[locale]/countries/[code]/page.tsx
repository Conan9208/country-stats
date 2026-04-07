'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

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

function TickerNumber({
  base, perSecond, symbol, decimals = 0, className = '',
}: {
  base: number; perSecond: number; symbol: string; decimals?: number; className?: string
}) {
  const rafRef   = useRef<number>(0)
  const startRef = useRef(performance.now())
  const elRef    = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    startRef.current = performance.now()
    const tick = (now: number) => {
      const elapsed = (now - startRef.current) / 1000
      const val     = base + elapsed * perSecond
      if (elRef.current) {
        elRef.current.textContent =
          symbol + ' ' + val.toLocaleString('en-US', { maximumFractionDigits: decimals })
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [base, perSecond, symbol, decimals])

  return (
    <span
      ref={elRef}
      className={className}
      style={{ fontFamily: '"Courier New", "Consolas", monospace', fontVariantNumeric: 'tabular-nums' }}
    >
      {symbol} {base.toLocaleString('en-US')}
    </span>
  )
}

export default function CountryDebtPage() {
  const { code } = useParams<{ code: string }>()
  const [data,    setData]    = useState<DebtData | null>(null)
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!code) return
    setLoading(true)
    setError(null)
    fetch(`/api/country/${code}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else         setData(d)
      })
      .catch(() => setError('데이터를 불러오지 못했어요'))
      .finally(() => setLoading(false))
  }, [code])

  return (
    <main style={{ minHeight: '100vh', background: '#050a10', color: '#f1f5f9', fontFamily: 'inherit' }}>
      {/* 헤더 */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(9,9,11,0.85)',
        backdropFilter: 'blur(16px)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        height: 52,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <Link
          href="/?tab=map"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            color: '#94a3b8',
            padding: '5px 12px',
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            textDecoration: 'none',
          }}
        >
          ← 지도로
        </Link>

        {data && (
          <>
            {data.flag && (
              <img src={data.flag} alt="" style={{ height: 22, borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)' }} />
            )}
            <span style={{ fontWeight: 700, fontSize: 16 }}>{data.name}</span>
            <span style={{ fontSize: 12, color: '#475569' }}>국가 부채 현황</span>
          </>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: '#1e3a5f', fontWeight: 700, letterSpacing: '0.1em' }}>
          🌍 WorldStats
        </span>
      </div>

      {/* 콘텐츠 */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>

        {loading && (
          <div style={{ textAlign: 'center', color: '#334155', marginTop: 80, fontSize: 14 }}>
            데이터를 불러오는 중...
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', marginTop: 80 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📭</div>
            <div style={{ color: '#f87171', fontSize: 15, marginBottom: 8 }}>{error}</div>
            <div style={{ color: '#334155', fontSize: 13 }}>World Bank에 해당 국가의 부채 데이터가 없어요</div>
          </div>
        )}

        {data && (
          <>
            {/* 메인 티커 */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 20,
              padding: '36px 40px',
              marginBottom: 24,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 12, color: '#475569', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20 }}>
                국가 부채 실시간 추산
              </div>

              {/* 자국 통화 */}
              {data.localDebt && data.perSecondLocal && data.currency ? (
                <>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>
                    {data.currency.name} ({data.currency.code})
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: '#f1f5f9', lineHeight: 1.1 }}>
                    <TickerNumber
                      base={data.localDebt}
                      perSecond={data.perSecondLocal}
                      symbol={data.currency.symbol}
                      key={`local-${data.code}`}
                    />
                  </div>

                  <div style={{ margin: '16px 0 8px', fontSize: 13, color: '#334155' }}>≈</div>

                  {/* USD */}
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>US Dollar (USD)</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#60a5fa', fontVariantNumeric: 'tabular-nums' }}>
                    <TickerNumber
                      base={data.totalDebtUSD}
                      perSecond={data.perSecondUSD}
                      symbol="$"
                      key={`usd-${data.code}`}
                    />
                  </div>
                </>
              ) : (
                // 자국 통화 없으면 USD만
                <div style={{ fontSize: 36, fontWeight: 900, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums' }}>
                  <TickerNumber
                    base={data.totalDebtUSD}
                    perSecond={data.perSecondUSD}
                    symbol="$"
                    key={`usd-only-${data.code}`}
                  />
                </div>
              )}
            </div>

            {/* 스탯 카드 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
              {[
                {
                  label: 'GDP',
                  value: formatUSD(data.gdpUSD),
                  sub: `${data.gdpYear}년 기준`,
                  color: '#a78bfa',
                },
                {
                  label: '부채 / GDP',
                  value: `${data.debtRatio.toFixed(1)}%`,
                  sub: `${data.debtYear}년 기준`,
                  color: data.debtRatio > 100 ? '#f87171' : data.debtRatio > 60 ? '#fb923c' : '#4ade80',
                },
                {
                  label: '연 이자율 (추산)',
                  value: `${data.interestRate.toFixed(1)}%`,
                  sub: data.interestYear ? `${data.interestYear}년 실질금리` : '기본값 적용',
                  color: '#60a5fa',
                },
                {
                  label: '초당 이자',
                  value: data.currency && data.perSecondLocal
                    ? `${data.currency.symbol}${data.perSecondLocal.toLocaleString('en-US', { maximumFractionDigits: 1 })}`
                    : `$${data.perSecondUSD.toFixed(2)}`,
                  sub: `≈ $${data.perSecondUSD.toFixed(2)}/s`,
                  color: '#f472b6',
                },
              ].map(card => (
                <div key={card.label} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 14,
                  padding: '16px 20px',
                }}>
                  <div style={{ fontSize: 11, color: '#475569', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                    {card.label}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: card.color, fontVariantNumeric: 'tabular-nums' }}>
                    {card.value}
                  </div>
                  <div style={{ fontSize: 11, color: '#334155', marginTop: 4 }}>{card.sub}</div>
                </div>
              ))}
            </div>

            {/* 환율 정보 */}
            {data.exchangeRate && data.currency && (
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 12,
                padding: '12px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}>
                <span style={{ fontSize: 12, color: '#475569' }}>환율 기준</span>
                <span style={{ fontSize: 13, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                  1 USD = {data.exchangeRate.toLocaleString('en-US', { maximumFractionDigits: 2 })} {data.currency.code}
                </span>
              </div>
            )}

            {/* 데이터 출처 */}
            <div style={{ fontSize: 11, color: '#1e293b', textAlign: 'center', lineHeight: 1.8 }}>
              데이터 출처: World Bank Open Data · 환율: open.er-api.com<br />
              이 수치는 공개된 통계 기반 추산이며 실제 수치와 다를 수 있습니다.
            </div>
          </>
        )}
      </div>
    </main>
  )
}
