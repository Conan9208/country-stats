'use client'

import Link from 'next/link'
import { Bug, BarChart2, Trash2, Lightbulb, Mail, User } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function ContactContent() {
  const t = useTranslations('Contact')

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white">{t('heading')}</h1>
        <p className="text-zinc-400 mt-2 text-sm">{t('subheading')}</p>
      </div>

      <div className="space-y-8 text-zinc-300 text-sm leading-relaxed">
        <section className="space-y-4">
          <div className="bg-zinc-900 border border-blue-900/40 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-3 mb-1">
              <Mail size={18} className="text-blue-300 shrink-0" />
              <h2 className="text-base font-semibold text-white">{t('emailTitle')}</h2>
            </div>
            <p className="text-zinc-400">{t('emailDesc')}</p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
              <a
                href={`mailto:${t('emailValue')}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-200 transition-colors text-xs font-medium"
              >
                <Mail size={14} /> {t('emailValue')}
              </a>
              <span className="inline-flex items-center gap-2 text-xs text-zinc-500">
                <User size={13} /> {t('operatorLabel')}: {t('operatorValue')}
              </span>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-2">
            <div className="flex items-center gap-3 mb-1">
              <Bug size={18} className="text-zinc-400 shrink-0" />
              <h2 className="text-base font-semibold text-white">{t('bugReportTitle')}</h2>
            </div>
            <p className="text-zinc-400">{t('bugReportDesc')}</p>
            <a
              href="https://github.com/Conan9208/country-stats/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-200 transition-colors text-xs font-medium"
            >
              {t('githubLink')}
            </a>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-2">
            <div className="flex items-center gap-3 mb-1">
              <BarChart2 size={18} className="text-zinc-400 shrink-0" />
              <h2 className="text-base font-semibold text-white">{t('dataErrorTitle')}</h2>
            </div>
            <p className="text-zinc-400">{t('dataErrorDesc')}</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-2">
            <div className="flex items-center gap-3 mb-1">
              <Trash2 size={18} className="text-zinc-400 shrink-0" />
              <h2 className="text-base font-semibold text-white">{t('commentDeleteTitle')}</h2>
            </div>
            <p className="text-zinc-400">{t('commentDeleteDesc')}</p>
          </div>
        </section>

        <section className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4 text-zinc-500 text-xs">
          <span className="flex items-start gap-2">
            <Lightbulb size={13} className="shrink-0 mt-0.5" />
            {t('responseTime')}
          </span>
        </section>
      </div>

      <div className="mt-16 pt-8 border-t border-zinc-800 flex flex-wrap gap-6 text-sm text-zinc-600">
        <Link href="/" className="hover:text-zinc-400 transition-colors">{t('footerHome')}</Link>
        <Link href="/about" className="hover:text-zinc-400 transition-colors">{t('footerAbout')}</Link>
        <Link href="/privacy" className="hover:text-zinc-400 transition-colors">{t('footerPrivacy')}</Link>
        <Link href="/terms" className="hover:text-zinc-400 transition-colors">{t('footerTerms')}</Link>
      </div>
    </div>
  )
}
