import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import SiteHeader from '@/components/SiteHeader'
import ContactContent from '@/components/ContactContent'

type Props = { params: Promise<{ locale: string }> }

const BASE_URL = 'https://postmyglobe.com'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Contact' })
  const title = t('metaTitle')
  const description = t('metaDesc')
  const pageUrl = locale === 'en' ? `${BASE_URL}/contact` : `${BASE_URL}/${locale}/contact`
  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
      languages: {
        ko: `${BASE_URL}/ko/contact`,
        en: `${BASE_URL}/contact`,
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

export default async function ContactPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <SiteHeader />
      <ContactContent />
    </div>
  )
}
