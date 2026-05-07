import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import SiteHeader from '@/components/SiteHeader'

type Props = { params: Promise<{ locale: string }> }

const BASE_URL = 'https://postmyglobe.com'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Terms' })
  const title = t('metaTitle')
  const description = t('metaDesc')
  const pageUrl = locale === 'en' ? `${BASE_URL}/terms` : `${BASE_URL}/${locale}/terms`
  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
      languages: {
        ko: `${BASE_URL}/ko/terms`,
        en: `${BASE_URL}/terms`,
      },
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: 'PostMyGlobe',
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.png'],
    },
  }
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'Terms' })

  const sections = Array.from({ length: 11 }, (_, i) => i + 1).map((n) => ({
    title: t(`section${n}Title`),
    body: t(`section${n}Body`),
  }))

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <SiteHeader />
      <div className="max-w-2xl mx-auto px-6 py-12">

        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white">{t('heading')}</h1>
          <p className="text-zinc-500 mt-2 text-sm">{t('lastUpdated')}</p>
        </div>

        <div className="space-y-10 text-zinc-300 leading-relaxed text-sm">
          <section>
            <p>{t('intro')}</p>
          </section>

          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-base font-semibold text-white mb-3">{s.title}</h2>
              <p className="whitespace-pre-line">{s.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-zinc-800 flex flex-wrap gap-6 text-sm text-zinc-600">
          <Link href="/" className="hover:text-zinc-400 transition-colors">{t('footerHome')}</Link>
          <Link href="/about" className="hover:text-zinc-400 transition-colors">{t('footerAbout')}</Link>
          <Link href="/privacy" className="hover:text-zinc-400 transition-colors">{t('footerPrivacy')}</Link>
          <Link href="/contact" className="hover:text-zinc-400 transition-colors">{t('footerContact')}</Link>
        </div>
      </div>
    </div>
  )
}
