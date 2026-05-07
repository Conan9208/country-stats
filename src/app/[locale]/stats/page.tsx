import { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import StatsContent from './StatsContent'
import AdSlot from '@/components/AdSlot'
import { AD_SLOTS } from '@/lib/adSlots'

const BASE_URL = 'https://postmyglobe.com'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const isKo = locale === 'ko'
  const pageUrl = isKo ? `${BASE_URL}/ko/stats` : `${BASE_URL}/stats`
  const title = isKo ? '방문자 통계 | PostMyGlobe' : 'Visitor Stats | PostMyGlobe'
  const description = isKo
    ? 'PostMyGlobe 방문자 출신 국가 통계 대시보드.'
    : 'PostMyGlobe visitor country statistics dashboard.'

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
      languages: {
        ko: `${BASE_URL}/ko/stats`,
        en: `${BASE_URL}/stats`,
      },
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: 'PostMyGlobe',
      type: 'website',
    },
  }
}

export default async function StatsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'VisitorStats' })

  return (
    <>
      <StatsContent />
      <section className="bg-zinc-950 text-white border-t border-zinc-900">
        <div className="max-w-3xl mx-auto px-6 py-10 space-y-4 text-sm text-zinc-400 leading-relaxed">
          <h2 className="text-xl font-semibold text-zinc-100">{t('heading')}</h2>
          <p>{t('intro')}</p>
          <ul className="space-y-1.5 list-disc pl-5">
            <li>{t('methodology1')}</li>
            <li>{t('methodology2')}</li>
            <li>{t('methodology3')}</li>
          </ul>
          <p className="text-xs text-zinc-600 italic">{t('privacyNote')}</p>
          <AdSlot slot={AD_SLOTS.statsTop} className="rounded-lg mt-4" />
        </div>
      </section>
    </>
  )
}
