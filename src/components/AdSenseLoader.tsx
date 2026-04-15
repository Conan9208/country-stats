'use client'

import { useEffect } from 'react'

export default function AdSenseLoader() {
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8766166885849764'
    script.async = true
    script.crossOrigin = 'anonymous'
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [])
  return null
}
