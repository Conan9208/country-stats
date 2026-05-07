import { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import DonateContent from './DonateContent'

const BASE_URL = 'https://postmyglobe.com'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const isKo = locale === 'ko'
  const pageUrl = isKo ? `${BASE_URL}/ko/donate` : `${BASE_URL}/donate`
  const title = isKo ? 'PostMyGlobe 후원하기' : 'Support PostMyGlobe'
  const description = isKo
    ? 'PostMyGlobe를 응원해주세요. 카카오페이 또는 Ko-fi로 후원하실 수 있어요.'
    : 'Support PostMyGlobe and help keep the interactive 3D globe running. Donate via Ko-fi or KakaoPay.'

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
      languages: {
        ko: `${BASE_URL}/ko/donate`,
        en: `${BASE_URL}/donate`,
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

export default async function DonatePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'DonateInfo' })

  return (
    <>
      <DonateContent />
      <section className="max-w-3xl mx-auto px-6 pb-16 text-white">
        <div className="border-t border-zinc-800 pt-10 space-y-4 text-sm text-zinc-400 leading-relaxed">
          <h2 className="text-xl font-semibold text-zinc-100">{t('heading')}</h2>
          <h3 className="text-base font-semibold text-zinc-200">{t('whyTitle')}</h3>
          <p>{t('whyBody')}</p>
          <h3 className="text-base font-semibold text-zinc-200 pt-2">{t('transparencyTitle')}</h3>
          <p>{t('transparencyBody')}</p>
        </div>
      </section>
    </>
  )
}
