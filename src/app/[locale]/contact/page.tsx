import type { Metadata } from 'next'
import Link from 'next/link'
import { Bug, BarChart2, Trash2, Lightbulb } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import SiteHeader from '@/components/SiteHeader'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Contact' })
  return {
    title: t('metaTitle'),
    description: t('metaDesc'),
  }
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'Contact' })

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <SiteHeader />
      <div className="max-w-2xl mx-auto px-6 py-12">

        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white">{t('heading')}</h1>
          <p className="text-zinc-400 mt-2 text-sm">{t('subheading')}</p>
        </div>

        <div className="space-y-8 text-zinc-300 text-sm leading-relaxed">

          <section className="space-y-4">

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

        <div className="mt-16 pt-8 border-t border-zinc-800 flex gap-6 text-sm text-zinc-600">
          <Link href="/" className="hover:text-zinc-400 transition-colors">{t('footerHome')}</Link>
          <Link href="/about" className="hover:text-zinc-400 transition-colors">{t('footerAbout')}</Link>
          <Link href="/privacy" className="hover:text-zinc-400 transition-colors">{t('footerPrivacy')}</Link>
        </div>
      </div>
    </div>
  )
}
