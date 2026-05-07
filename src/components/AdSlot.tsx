'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { ADSENSE_CLIENT } from '@/lib/adSlots'

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

const NO_ADS_PATHS = ['/contact', '/donate', '/terms', '/admin']

type Props = {
  slot: string
  format?: 'auto' | 'fluid' | 'rectangle'
  layout?: string
  className?: string
}

export default function AdSlot({ slot, format = 'auto', layout, className = '' }: Props) {
  const pathname = usePathname()
  const blocked = NO_ADS_PATHS.some((p) => pathname?.includes(p))

  useEffect(() => {
    if (blocked || !slot) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      /* AdSense script not yet loaded — next render will retry */
    }
  }, [pathname, slot, blocked])

  if (blocked || !slot) return null

  return (
    <ins
      className={`adsbygoogle block ${className}`}
      style={{ display: 'block', minHeight: 100 }}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={slot}
      data-ad-format={format}
      data-ad-layout={layout}
      data-full-width-responsive="true"
    />
  )
}
