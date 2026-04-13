'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Send } from 'lucide-react'

export default function SiteHeader() {
  const t = useTranslations('Nav')
  const pathname = usePathname()

  const isAbout = pathname.includes('/about')
  const isPrivacy = pathname.includes('/privacy')
  const isContact = pathname.includes('/contact')
  const isDonate = pathname.includes('/donate')

  return (
    <div className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 flex items-center gap-6 h-12">

        <Link
          href="/"
          className="text-base font-bold tracking-tight whitespace-nowrap flex items-center gap-1.5 text-white hover:text-zinc-300 transition-colors"
        >
          <Send size={16} /> PostMyGlobe
        </Link>

        <div className="w-px h-5 bg-zinc-700" />

        <div className="flex gap-0">
          <Link
            href="/?tab=map"
            className="px-5 h-12 text-sm font-medium transition-all border-b-2 border-transparent text-zinc-500 hover:text-zinc-300 flex items-center"
          >
            {t('globe')}
          </Link>
          <Link
            href="/?tab=feed"
            className="px-5 h-12 text-sm font-medium transition-all border-b-2 border-transparent text-zinc-500 hover:text-zinc-300 flex items-center"
          >
            {t('feed')}
          </Link>
        </div>

        <div className="flex-1" />

        <div className="hidden sm:flex items-center gap-4 text-xs text-zinc-600">
          <Link
            href="/donate"
            className={`px-2.5 py-1 rounded-md border transition-all font-medium ${
              isDonate
                ? 'text-amber-200 bg-amber-400/20 border-amber-400/30'
                : 'text-amber-300/80 bg-amber-400/10 border-amber-400/20 hover:bg-amber-400/20 hover:text-amber-200'
            }`}
          >
            {t('donate')}
          </Link>
          <Link href="/about" className={`transition-colors ${isAbout ? 'text-zinc-200' : 'hover:text-zinc-400'}`}>
            {t('about')}
          </Link>
          <Link href="/privacy" className={`transition-colors ${isPrivacy ? 'text-zinc-200' : 'hover:text-zinc-400'}`}>
            {t('privacy')}
          </Link>
          <Link href="/contact" className={`transition-colors ${isContact ? 'text-zinc-200' : 'hover:text-zinc-400'}`}>
            {t('contact')}
          </Link>
        </div>

      </div>
    </div>
  )
}
