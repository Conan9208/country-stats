import { Metadata } from 'next'
import StatsContent from './StatsContent'

const BASE_URL = 'https://postmyglobe.com'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
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
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: 'PostMyGlobe',
      type: 'website',
    },
  }
}

export default function StatsPage() {
  return <StatsContent />
}
