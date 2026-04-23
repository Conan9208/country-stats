import { Metadata } from 'next'
import DonateContent from './DonateContent'

const BASE_URL = 'https://postmyglobe.com'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
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

export default function DonatePage() {
  return <DonateContent />
}
