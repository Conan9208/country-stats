'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const NO_ADS_PATHS = ['/contact', '/donate']

export default function AdSenseLoader() {
  const pathname = usePathname()
  const blocked = NO_ADS_PATHS.some(p => pathname === p || pathname.endsWith(p))

  useEffect(() => {
    if (blocked) return
    const script = document.createElement('script')
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8766166885849764'
    script.async = true
    script.crossOrigin = 'anonymous'
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [blocked])
  return null
}
