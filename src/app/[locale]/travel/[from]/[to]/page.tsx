import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import isoCountries from 'i18n-iso-countries'
import localeKo from 'i18n-iso-countries/langs/ko.json'
import localeEn from 'i18n-iso-countries/langs/en.json'
import TravelClient from './TravelClient'
import { calcTimeDiff, formatTimeDiff } from '@/lib/travelUtils'
import { getVisaRequirement } from '@/lib/visaCheck'
import { getCountryBasic } from '@/lib/countryData'
import type { CountryBasic } from '@/types/travel'

isoCountries.registerLocale(localeKo)
isoCountries.registerLocale(localeEn)

const BASE_URL = 'https://postmyglobe.com'

// ─── 국가 데이터 조회 (오프라인 번들 — 외부 API 의존 없음) ────────────────────
// restcountries.com 다운 이후 번들 데이터로 전환. 유효 ISO alpha-2 면 항상 반환.

function fetchCountry(code: string): CountryBasic | null {
  return getCountryBasic(code, false)
}

// ─── 표시 이름 (로케일 반영) ──────────────────────────────────────────────────

function displayName(code: string, fallback: string, isKo: boolean): string {
  if (isKo) return isoCountries.getName(code.toUpperCase(), 'ko') ?? fallback
  return fallback
}

// ─── generateMetadata ────────────────────────────────────────────────────────

type Params = Promise<{ from: string; to: string; locale: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { from, to, locale } = await params
  const isKo = locale === 'ko'

  const [fromData, toData] = await Promise.all([fetchCountry(from), fetchCountry(to)])

  const fromDisplay = displayName(from, fromData?.name ?? from.toUpperCase(), isKo)
  const toDisplay   = displayName(to,   toData?.name   ?? to.toUpperCase(),   isKo)

  const title = isKo
    ? `${fromDisplay} → ${toDisplay} 여행 정보 | 비자·환율·시차 | PostMyGlobe`
    : `${fromDisplay} to ${toDisplay} Travel Info | Visa, Exchange Rate, Time | PostMyGlobe`

  const description = isKo
    ? `${fromDisplay}에서 ${toDisplay} 여행 시 비자 종류, 환율, 날씨, 시차, 전압 정보를 한눈에 확인하세요.`
    : `Travel from ${fromDisplay} to ${toDisplay}: visa requirements, exchange rate, weather, time difference, and voltage info in one place.`

  const fromUpper = from.toUpperCase()
  const toUpper   = to.toUpperCase()
  const pageUrl   = locale === 'en'
    ? `${BASE_URL}/travel/${fromUpper}/${toUpper}`
    : `${BASE_URL}/${locale}/travel/${fromUpper}/${toUpper}`

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
      languages: {
        ko: `${BASE_URL}/ko/travel/${fromUpper}/${toUpper}`,
        en: `${BASE_URL}/travel/${fromUpper}/${toUpper}`,
      },
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: 'PostMyGlobe',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: `${fromDisplay} → ${toDisplay} travel info` }],
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

// ─── Page (Server Component) ─────────────────────────────────────────────────

export default async function TravelPage({ params }: { params: Params }) {
  const { from, to, locale } = await params
  const isKo = locale === 'ko'

  const [fromData, toData, visa] = await Promise.all([
    fetchCountry(from),
    fetchCountry(to),
    getVisaRequirement(from, to),
  ])

  if (!fromData || !toData) notFound()

  const fromDisplay = displayName(from, fromData.name, isKo)
  const toDisplay   = displayName(to,   toData.name,   isKo)

  const timeDiff = calcTimeDiff(fromData, toData)

  // ─── JSON-LD ───────────────────────────────────────────────────────────────

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: isKo
          ? `${fromDisplay}에서 ${toDisplay} 여행 시 비자가 필요한가요?`
          : `Do I need a visa to travel from ${fromDisplay} to ${toDisplay}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: visa?.label_ko ?? (isKo ? '정보 없음' : 'Unknown'),
        },
      },
      {
        '@type': 'Question',
        name: isKo
          ? `${fromDisplay}와 ${toDisplay}의 시차는 얼마인가요?`
          : `What is the time difference between ${fromDisplay} and ${toDisplay}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: formatTimeDiff(timeDiff),
        },
      },
      {
        '@type': 'Question',
        name: isKo
          ? `${fromDisplay}에서 ${toDisplay} 여행 시 환율은?`
          : `What currency do I need when traveling from ${fromDisplay} to ${toDisplay}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: isKo
            ? `${fromData.currency.code}을(를) ${toData.currency.code}(으)로 환전이 필요합니다. 실시간 환율은 페이지에서 확인하세요.`
            : `You'll need to exchange ${fromData.currency.code} to ${toData.currency.code}. Check the page for the live exchange rate.`,
        },
      },
    ],
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'PostMyGlobe', item: BASE_URL },
      {
        '@type': 'ListItem',
        position: 2,
        name: isKo ? '여행 정보' : 'Travel Info',
        item: locale === 'en' ? `${BASE_URL}/travel` : `${BASE_URL}/${locale}/travel`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${fromDisplay} → ${toDisplay}`,
        item: locale === 'en'
          ? `${BASE_URL}/travel/${from.toUpperCase()}/${to.toUpperCase()}`
          : `${BASE_URL}/${locale}/travel/${from.toUpperCase()}/${to.toUpperCase()}`,
      },
    ],
  }

  const timeDiffText = formatTimeDiff(timeDiff)
  const VISA_EN: Record<string, string> = {
    'visa-free': 'Visa-free', 'voa': 'Visa on arrival', 'evisa': 'eVisa required',
    'required': 'Visa required', 'no-admission': 'No admission', 'unknown': 'Unknown',
  }
  const visaLabel = isKo
    ? (visa?.label_ko ?? '정보 없음')
    : (visa ? (VISA_EN[visa.type] ?? 'Check requirements') : 'Check requirements')

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {/* SSR 요약 헤더: 구글봇·AdSense가 읽는 게시자 콘텐츠 + 사용자에게도 유용한 정보 */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-5">
        <h1 className="text-xl font-bold text-white mb-2">
          {fromDisplay} → {toDisplay}{' '}
          {isKo ? '여행 정보' : 'Travel Info'}
        </h1>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-400">
          <div className="flex gap-1.5">
            <dt className="text-zinc-500">{isKo ? '비자' : 'Visa'}</dt>
            <dd className="text-zinc-200">{visaLabel}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-zinc-500">{isKo ? '시차' : 'Time diff'}</dt>
            <dd className="text-zinc-200">{timeDiffText}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-zinc-500">{isKo ? '통화' : 'Currency'}</dt>
            <dd className="text-zinc-200">{fromData.currency.code} → {toData.currency.code}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-zinc-500">{isKo ? '언어' : 'Language'}</dt>
            <dd className="text-zinc-200">{toData.languages.slice(0, 2).join(', ')}</dd>
          </div>
        </dl>
      </header>
      <TravelClient fromData={fromData} toData={toData} visa={visa} />
    </>
  )
}
