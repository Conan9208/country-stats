'use client'

import { useEffect, useRef } from 'react'

interface DebtTickerProps {
  base: number
  perSecond: number
  symbol: string
  decimals?: number
  style?: React.CSSProperties
}

export default function DebtTicker({ base, perSecond, symbol, decimals = 0, style }: DebtTickerProps) {
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)
  const elRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    startRef.current = performance.now()
    const tick = (now: number) => {
      const elapsed = (now - startRef.current) / 1000
      const val = base + elapsed * perSecond
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
      style={{
        fontFamily: '"Courier New", "Consolas", monospace',
        fontVariantNumeric: 'tabular-nums',
        ...style,
      }}
    >
      {symbol} {base.toLocaleString('en-US')}
    </span>
  )
}
