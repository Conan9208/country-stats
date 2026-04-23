import { Metadata } from 'next'
import { redirect } from 'next/navigation'

const BASE_URL = 'https://postmyglobe.com'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ from?: string; to?: string }>
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const isKo = locale === 'ko'
  const pageUrl = isKo ? `${BASE_URL}/ko/travel` : `${BASE_URL}/travel`
  const title = isKo ? '국가 간 여행 정보 | PostMyGlobe' : 'Country Travel Info | PostMyGlobe'
  const description = isKo
    ? '국가 간 비자, 시차, 환율 정보를 한눈에. 출발국과 도착국을 선택하세요.'
    : 'Visa requirements, time differences, and exchange rates between countries at a glance.'

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
      languages: {
        ko: `${BASE_URL}/ko/travel`,
        en: `${BASE_URL}/travel`,
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

// 구 URL (?from=KR&to=US) 및 /travel 직접 접근을 새 경로로 redirect
export default async function TravelIndexPage({ params, searchParams }: Props) {
  const { locale }   = await params
  const sp           = await searchParams
  const from = (sp.from ?? 'KR').toUpperCase()
  const to   = (sp.to   ?? (from === 'US' ? 'JP' : 'US')).toUpperCase()
  redirect(`/${locale}/travel/${from}/${to}`)
}
