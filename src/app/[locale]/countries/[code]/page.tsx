import { Metadata } from 'next'
import Link from 'next/link'
import DebtTicker from './DebtTicker'
import { CURATED_FACTS_KO, CURATED_FACTS_EN } from '@/data/countryFacts'
import { routing } from '@/i18n/routing'
import { buildNarrative, type NarrativeInput } from '@/lib/countryNarrative'
import AdSlot from '@/components/AdSlot'
import { AD_SLOTS } from '@/lib/adSlots'

const BASE_URL = 'https://postmyglobe.com'
const WB = 'https://api.worldbank.org/v2'

const POPULAR_COUNTRIES = [
  { code: 'us', nameKo: '미국', nameEn: 'United States' },
  { code: 'jp', nameKo: '일본', nameEn: 'Japan' },
  { code: 'kr', nameKo: '한국', nameEn: 'South Korea' },
  { code: 'cn', nameKo: '중국', nameEn: 'China' },
  { code: 'gb', nameKo: '영국', nameEn: 'United Kingdom' },
  { code: 'de', nameKo: '독일', nameEn: 'Germany' },
  { code: 'fr', nameKo: '프랑스', nameEn: 'France' },
  { code: 'br', nameKo: '브라질', nameEn: 'Brazil' },
  { code: 'in', nameKo: '인도', nameEn: 'India' },
  { code: 'au', nameKo: '호주', nameEn: 'Australia' },
]

// ─── 타입 ────────────────────────────────────────────────────────────────────

type CountryData = {
  code: string
  name: string
  flag: string
  currency: { code: string; symbol: string; name: string } | null
  population: number | null
  area: number | null
  capital: string | null
  region: string | null
  subregion: string | null
  languages: Record<string, string> | null
  timezones: string[] | null
  borders: string[] | null
  landlocked: boolean | null
  unMember: boolean | null
  startOfWeek: string | null
  drivingSide: 'left' | 'right' | null
  demonym: string | null
  tld: string[] | null
  independent: boolean | null
  fifa: string | null
  iddRoot: string | null
  iddSuffixes: string[] | null
  continents: string[] | null
  gdpUSD: number
  gdpYear: string
  debtRatio: number
  debtYear: string
  interestRate: number
  interestYear: string | null
  totalDebtUSD: number
  perSecondUSD: number
  localDebt: number | null
  perSecondLocal: number | null
  exchangeRate: number | null
}

// ─── 데이터 fetching ─────────────────────────────────────────────────────────

async function wbFetch(country: string, indicator: string) {
  try {
    const res = await fetch(
      `${WB}/country/${country}/indicator/${indicator}?format=json&mrv=5&per_page=5`,
      { next: { revalidate: 86400 } }
    )
    const json = await res.json()
    const entries: { value: number | null; date: string }[] = json?.[1] ?? []
    for (const e of entries) {
      if (e.value !== null) return { value: e.value, year: e.date }
    }
  } catch { /* ignore */ }
  return null
}

async function fetchCountryData(code: string): Promise<CountryData | null> {
  const upper = code.toUpperCase()

  const [gdpRes, debtRatioRes, interestRes, exRateRes, countryRes] = await Promise.allSettled([
    wbFetch(upper, 'NY.GDP.MKTP.CD'),
    wbFetch(upper, 'GC.DOD.TOTL.GD.ZS'),
    wbFetch(upper, 'FR.INR.RINR'),
    fetch('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 3600 } }),
    fetch(`https://restcountries.com/v3.1/alpha/${upper}?fields=name,flags,currencies,region,subregion,capital,population,area,languages,timezones,borders,landlocked,unMember,startOfWeek,car,demonyms,tld,independent,fifa,idd,continents`, {
      next: { revalidate: 86400 },
    }),
  ])

  const gdp       = gdpRes.status       === 'fulfilled' ? gdpRes.value       : null
  const debtRatio = debtRatioRes.status === 'fulfilled' ? debtRatioRes.value : null
  const interest  = interestRes.status  === 'fulfilled' ? interestRes.value  : null

  let exchangeRates: Record<string, number> = {}
  if (exRateRes.status === 'fulfilled' && exRateRes.value.ok) {
    const d = await exRateRes.value.json()
    exchangeRates = d.rates ?? {}
  }

  type CurrencyInfo = { code: string; symbol: string; name: string } | null
  let countryName = upper
  let flagUrl     = ''
  let currency: CurrencyInfo = null
  let population: number | null = null
  let area:       number | null = null
  let capital:    string | null = null
  let region:     string | null = null
  let subregion:  string | null = null
  let languages:  Record<string, string> | null = null
  let timezones:  string[] | null = null
  let borders:    string[] | null = null
  let landlocked: boolean | null = null
  let unMember:   boolean | null = null
  let startOfWeek: string | null = null
  let drivingSide: 'left' | 'right' | null = null
  let demonym:    string | null = null
  let tld:        string[] | null = null
  let independent: boolean | null = null
  let fifa:       string | null = null
  let iddRoot:    string | null = null
  let iddSuffixes: string[] | null = null
  let continents: string[] | null = null

  if (countryRes.status === 'fulfilled' && countryRes.value.ok) {
    const raw  = await countryRes.value.json()
    const c    = Array.isArray(raw) ? raw[0] : raw
    const entries = Object.entries(c?.currencies ?? {}) as [string, { symbol?: string; name?: string }][]
    const [cCode, cMeta] = entries[0] ?? []
    countryName = c?.name?.common ?? upper
    flagUrl     = c?.flags?.svg ?? ''
    population  = c?.population ?? null
    area        = c?.area ?? null
    capital     = Array.isArray(c?.capital) ? c.capital[0] ?? null : null
    region      = c?.region ?? null
    subregion   = c?.subregion ?? null
    languages   = c?.languages ?? null
    timezones   = Array.isArray(c?.timezones) ? c.timezones : null
    borders     = Array.isArray(c?.borders) && c.borders.length > 0 ? c.borders : null
    landlocked  = typeof c?.landlocked === 'boolean' ? c.landlocked : null
    unMember    = typeof c?.unMember === 'boolean' ? c.unMember : null
    startOfWeek = typeof c?.startOfWeek === 'string' ? c.startOfWeek : null
    drivingSide = c?.car?.side === 'left' || c?.car?.side === 'right' ? c.car.side : null
    demonym     = c?.demonyms?.eng?.m ?? c?.demonyms?.eng?.f ?? null
    tld         = Array.isArray(c?.tld) ? c.tld : null
    independent = typeof c?.independent === 'boolean' ? c.independent : null
    fifa        = typeof c?.fifa === 'string' ? c.fifa : null
    iddRoot     = typeof c?.idd?.root === 'string' ? c.idd.root : null
    iddSuffixes = Array.isArray(c?.idd?.suffixes) ? c.idd.suffixes : null
    continents  = Array.isArray(c?.continents) ? c.continents : null
    if (cCode) {
      currency = { code: cCode, symbol: cMeta?.symbol ?? cCode, name: cMeta?.name ?? cCode }
    }
  }

  if (!gdp || !debtRatio) return null

  const totalDebtUSD = gdp.value * (debtRatio.value / 100)
  const annualRate   = interest?.value != null && interest.value > 0 ? interest.value / 100 : 0.04
  const perSecondUSD = totalDebtUSD * annualRate / (365 * 24 * 3600)

  let localDebt:      number | null = null
  let perSecondLocal: number | null = null
  let exchangeRate:   number | null = null

  if (currency && currency.code !== 'USD' && exchangeRates[currency.code]) {
    exchangeRate   = exchangeRates[currency.code]
    localDebt      = totalDebtUSD  * exchangeRate
    perSecondLocal = perSecondUSD  * exchangeRate
  }

  return {
    code: upper,
    name: countryName,
    flag: flagUrl,
    currency,
    population,
    area,
    capital,
    region,
    subregion,
    languages,
    timezones,
    borders,
    landlocked,
    unMember,
    startOfWeek,
    drivingSide,
    demonym,
    tld,
    independent,
    fifa,
    iddRoot,
    iddSuffixes,
    continents,
    gdpUSD:        gdp.value,
    gdpYear:       gdp.year,
    debtRatio:     debtRatio.value,
    debtYear:      debtRatio.year,
    interestRate:  annualRate * 100,
    interestYear:  interest?.year ?? null,
    totalDebtUSD,
    perSecondUSD,
    localDebt,
    perSecondLocal,
    exchangeRate,
  }
}

function formatUSD(n: number) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(3)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toFixed(0)}`
}

function formatPop(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`
  return n.toLocaleString()
}

// ─── generateStaticParams — 상위 20개국 빌드 시 프리렌더 ─────────────────────

const TOP_STATIC_COUNTRIES = [
  'us', 'jp', 'cn', 'kr', 'de', 'gb', 'fr', 'in', 'br', 'au',
  'ca', 'it', 'es', 'mx', 'ru', 'sa', 'tr', 'id', 'nl', 'ch',
]

export function generateStaticParams() {
  return routing.locales.flatMap(locale =>
    TOP_STATIC_COUNTRIES.map(code => ({ locale, code }))
  )
}

// ─── generateMetadata ────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string; locale: string }>
}): Promise<Metadata> {
  const { code, locale } = await params
  const data = await fetchCountryData(code)
  const pageUrl = locale === 'en'
    ? `${BASE_URL}/countries/${code.toLowerCase()}`
    : `${BASE_URL}/${locale}/countries/${code.toLowerCase()}`

  if (!data) {
    return {
      title: locale === 'ko' ? '국가 부채 데이터 없음 | PostMyGlobe' : 'No Debt Data | PostMyGlobe',
      alternates: { canonical: pageUrl },
    }
  }

  const { name, debtRatio, totalDebtUSD } = data
  const totalFmt = formatUSD(totalDebtUSD)
  const ratioFmt = debtRatio.toFixed(1)

  const title = locale === 'ko'
    ? `${name} 국가 부채 실시간 | PostMyGlobe`
    : `${name} National Debt Clock | PostMyGlobe`

  const description = locale === 'ko'
    ? `${name}의 국가 부채를 실시간으로 추산합니다. GDP 대비 ${ratioFmt}%, 현재 추산 부채 ${totalFmt}.`
    : `Real-time national debt estimate for ${name}. Debt-to-GDP ratio: ${ratioFmt}%, estimated total: ${totalFmt}.`

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
      languages: {
        ko: `${BASE_URL}/ko/countries/${code.toLowerCase()}`,
        en: `${BASE_URL}/countries/${code.toLowerCase()}`,
      },
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: 'PostMyGlobe',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: `${name} Debt Clock` }],
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

// ─── Page Component (Server) ─────────────────────────────────────────────────

export default async function CountryDebtPage({
  params,
}: {
  params: Promise<{ code: string; locale: string }>
}) {
  const { code, locale } = await params
  const data = await fetchCountryData(code)
  const isKo = locale === 'ko'

  const pageUrl = locale === 'en'
    ? `${BASE_URL}/countries/${code.toLowerCase()}`
    : `${BASE_URL}/${locale}/countries/${code.toLowerCase()}`

  const narrativeInput: NarrativeInput | null = data
    ? {
        code: data.code,
        name: data.name,
        population: data.population,
        area: data.area,
        capital: data.capital,
        region: data.region,
        subregion: data.subregion,
        languages: data.languages,
        timezones: data.timezones,
        borders: data.borders,
        landlocked: data.landlocked,
        unMember: data.unMember,
        startOfWeek: data.startOfWeek,
        drivingSide: data.drivingSide,
        demonym: data.demonym,
        tld: data.tld,
        independent: data.independent,
        fifa: data.fifa,
        iddRoot: data.iddRoot,
        iddSuffixes: data.iddSuffixes,
        continents: data.continents,
        currency: data.currency,
        exchangeRate: data.exchangeRate,
        gdpUSD: data.gdpUSD,
        gdpYear: data.gdpYear,
        debtRatio: data.debtRatio,
        debtYear: data.debtYear,
      }
    : null

  const narrative = narrativeInput ? buildNarrative(narrativeInput, isKo ? 'ko' : 'en') : null

  const datasetJsonLd = data
    ? {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: isKo ? `${data.name} 국가 부채 통계` : `${data.name} National Debt Statistics`,
        description: isKo
          ? `${data.name}의 국가 부채를 실시간으로 추산합니다. GDP 대비 부채 비율은 ${data.debtRatio.toFixed(1)}%이며, 추산 총 부채는 ${formatUSD(data.totalDebtUSD)}입니다. World Bank 공개 데이터 기반.`
          : `Real-time national debt estimate for ${data.name}. Debt-to-GDP ratio: ${data.debtRatio.toFixed(1)}%, estimated total debt: ${formatUSD(data.totalDebtUSD)}. Based on World Bank open data.`,
        url: pageUrl,
        variableMeasured: [
          { '@type': 'PropertyValue', name: 'GDP (USD)',              value: data.gdpUSD },
          { '@type': 'PropertyValue', name: 'Debt-to-GDP Ratio (%)', value: data.debtRatio },
          { '@type': 'PropertyValue', name: 'Annual Interest Rate (%)', value: data.interestRate },
        ],
      }
    : null

  const articleJsonLd = data && narrative
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: isKo
          ? `${data.name} 국가 정보와 부채 현황`
          : `${data.name}: Country Profile and National Debt Overview`,
        description: isKo
          ? `${data.name}의 지리, 인구, 경제, 문화, 정치적 지위, 실용 정보를 World Bank와 REST Countries 공개 데이터에 근거해 정리한 페이지입니다.`
          : `An overview of ${data.name} covering geography, demographics, economy, culture, political status, and practical information, sourced from World Bank and REST Countries open data.`,
        articleBody: [
          narrative.geography,
          narrative.demographics,
          narrative.economy,
          narrative.culture,
          narrative.government,
          narrative.practical,
        ].filter(Boolean).join(' '),
        inLanguage: isKo ? 'ko' : 'en',
        url: pageUrl,
        author: { '@type': 'Organization', name: 'PostMyGlobe' },
        publisher: { '@type': 'Organization', name: 'PostMyGlobe' },
        about: { '@type': 'Country', name: data.name },
      }
    : null

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'PostMyGlobe', item: BASE_URL },
      {
        '@type': 'ListItem',
        position: 2,
        name: data ? (isKo ? `${data.name} 국가 부채` : `${data.name} National Debt`) : code.toUpperCase(),
        item: pageUrl,
      },
    ],
  }

  return (
    <main style={{ minHeight: '100vh', background: '#050a10', color: '#f1f5f9', fontFamily: 'inherit' }}>
      {/* JSON-LD 구조화 데이터 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {datasetJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }}
        />
      )}
      {articleJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
        />
      )}

      {/* 헤더 */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(9,9,11,0.85)',
        backdropFilter: 'blur(16px)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        height: 52,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <Link
          href={isKo ? '/ko?tab=map' : '/?tab=map'}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            color: '#94a3b8',
            padding: '5px 12px',
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            textDecoration: 'none',
          }}
        >
          ← {isKo ? '지도로' : 'Back to Globe'}
        </Link>

        {data && (
          <>
            {data.flag && (
              <img src={data.flag} alt="" style={{ height: 22, borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)' }} />
            )}
            <span style={{ fontWeight: 700, fontSize: 16 }}>{data.name}</span>
            <span style={{ fontSize: 12, color: '#475569' }}>
              {isKo ? '국가 부채 현황' : 'National Debt'}
            </span>
          </>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: '#1e3a5f', fontWeight: 700, letterSpacing: '0.1em' }}>
          🌍 PostMyGlobe
        </span>
      </div>

      {/* 콘텐츠 */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>

        {!data && (
          <div style={{ textAlign: 'center', marginTop: 80 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📭</div>
            <div style={{ color: '#f87171', fontSize: 15, marginBottom: 8 }}>
              {isKo ? '이 나라의 부채 데이터를 찾을 수 없어요' : 'No debt data available for this country'}
            </div>
            <div style={{ color: '#334155', fontSize: 13 }}>
              {isKo ? 'World Bank에 해당 국가의 부채 데이터가 없어요' : 'World Bank has no debt data for this country'}
            </div>
          </div>
        )}

        {data && (
          <>
            <h1 style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#f1f5f9',
              margin: '0 0 8px',
              letterSpacing: '-0.01em',
            }}>
              {isKo ? `${data.name} 국가 정보 및 부채 현황` : `${data.name} — Country Profile & National Debt`}
            </h1>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              {isKo
                ? `${data.name}의 지리, 인구, 경제, 문화, 정치적 지위, 실용 정보를 한 페이지로 정리했습니다. 데이터는 World Bank와 REST Countries 공개 자료를 기반으로 합니다.`
                : `An overview of ${data.name} covering geography, demographics, economy, culture, political status, and practical information, sourced from World Bank and REST Countries open data.`}
            </p>

            {/* 메인 티커 */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 20,
              padding: '36px 40px',
              marginBottom: 24,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 12, color: '#475569', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20 }}>
                {isKo ? '국가 부채 실시간 추산' : 'National Debt Real-Time Estimate'}
              </div>

              {data.localDebt && data.perSecondLocal && data.currency ? (
                <>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>
                    {data.currency.name} ({data.currency.code})
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: '#f1f5f9', lineHeight: 1.1 }}>
                    <DebtTicker
                      base={data.localDebt}
                      perSecond={data.perSecondLocal}
                      symbol={data.currency.symbol}
                    />
                  </div>
                  <div style={{ margin: '16px 0 8px', fontSize: 13, color: '#334155' }}>≈</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>US Dollar (USD)</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#60a5fa' }}>
                    <DebtTicker
                      base={data.totalDebtUSD}
                      perSecond={data.perSecondUSD}
                      symbol="$"
                    />
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 36, fontWeight: 900, color: '#f1f5f9' }}>
                  <DebtTicker
                    base={data.totalDebtUSD}
                    perSecond={data.perSecondUSD}
                    symbol="$"
                  />
                </div>
              )}
            </div>

            {/* 스탯 카드 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
              {[
                {
                  label: 'GDP',
                  value: formatUSD(data.gdpUSD),
                  sub: isKo ? `${data.gdpYear}년 기준` : `${data.gdpYear} data`,
                  color: '#a78bfa',
                },
                {
                  label: isKo ? '부채 / GDP' : 'Debt / GDP',
                  value: `${data.debtRatio.toFixed(1)}%`,
                  sub: isKo ? `${data.debtYear}년 기준` : `${data.debtYear} data`,
                  color: data.debtRatio > 100 ? '#f87171' : data.debtRatio > 60 ? '#fb923c' : '#4ade80',
                },
                {
                  label: isKo ? '연 이자율 (추산)' : 'Annual Interest Rate',
                  value: `${data.interestRate.toFixed(1)}%`,
                  sub: data.interestYear
                    ? (isKo ? `${data.interestYear}년 실질금리` : `${data.interestYear} real rate`)
                    : (isKo ? '기본값 적용' : 'default applied'),
                  color: '#60a5fa',
                },
                {
                  label: isKo ? '초당 이자' : 'Per Second',
                  value: data.currency && data.perSecondLocal
                    ? `${data.currency.symbol}${data.perSecondLocal.toLocaleString('en-US', { maximumFractionDigits: 1 })}`
                    : `$${data.perSecondUSD.toFixed(2)}`,
                  sub: `≈ $${data.perSecondUSD.toFixed(2)}/s`,
                  color: '#f472b6',
                },
              ].map(card => (
                <div key={card.label} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 14,
                  padding: '16px 20px',
                }}>
                  <div style={{ fontSize: 11, color: '#475569', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                    {card.label}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: card.color, fontVariantNumeric: 'tabular-nums' }}>
                    {card.value}
                  </div>
                  <div style={{ fontSize: 11, color: '#334155', marginTop: 4 }}>{card.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ margin: '8px 0 16px' }}>
              <AdSlot slot={AD_SLOTS.countryMid} className="rounded-lg" />
            </div>

            {/* 환율 정보 */}
            {data.exchangeRate && data.currency && (
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 12,
                padding: '12px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}>
                <span style={{ fontSize: 12, color: '#475569' }}>
                  {isKo ? '환율 기준' : 'Exchange Rate'}
                </span>
                <span style={{ fontSize: 13, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                  1 USD = {data.exchangeRate.toLocaleString('en-US', { maximumFractionDigits: 2 })} {data.currency.code}
                </span>
              </div>
            )}

            {/* 데이터 출처 */}
            <div style={{ fontSize: 11, color: '#1e293b', textAlign: 'center', lineHeight: 1.8 }}>
              {isKo
                ? '데이터 출처: World Bank Open Data · 환율: open.er-api.com'
                : 'Data source: World Bank Open Data · Exchange rates: open.er-api.com'}
              <br />
              {isKo
                ? '이 수치는 공개된 통계 기반 추산이며 실제 수치와 다를 수 있습니다.'
                : 'These figures are estimates based on public statistics and may differ from actual values.'}
            </div>

            {/* 국가 소개 섹션 */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16,
              padding: '28px 32px',
              marginTop: 32,
            }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>
                {isKo ? `${data.name}에 대해` : `About ${data.name}`}
              </h2>

              {/* 기본 정보 텍스트 (크롤 가능 콘텐츠) */}
              {(data.capital || data.population || data.area) && (
                <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.8, marginBottom: 16 }}>
                  {isKo
                    ? [
                        data.capital && `${data.name}의 수도는 ${data.capital}이에요.`,
                        data.population && `인구는 약 ${formatPop(data.population)}명이에요.`,
                        data.area && `국토 면적은 ${data.area.toLocaleString()} km²예요.`,
                        data.subregion && `${data.subregion} 지역에 위치해 있어요.`,
                      ].filter(Boolean).join(' ')
                    : [
                        data.capital && `The capital of ${data.name} is ${data.capital}.`,
                        data.population && `It has a population of approximately ${formatPop(data.population)}.`,
                        data.area && `The country covers an area of ${data.area.toLocaleString()} km².`,
                        data.subregion && `It is located in ${data.subregion}.`,
                      ].filter(Boolean).join(' ')
                  }
                </p>
              )}

              {/* curated 팩트 */}
              {(() => {
                const fact = isKo
                  ? CURATED_FACTS_KO[data.code]
                  : CURATED_FACTS_EN[data.code]
                if (!fact) return null
                return (
                  <div style={{
                    background: 'rgba(139,92,246,0.08)',
                    border: '1px solid rgba(139,92,246,0.2)',
                    borderRadius: 10,
                    padding: '14px 18px',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                  }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
                    <p style={{ fontSize: 14, color: '#c4b5fd', lineHeight: 1.7, margin: 0 }}>
                      {fact}
                    </p>
                  </div>
                )
              })()}
            </div>

            <div style={{ margin: '16px 0' }}>
              <AdSlot slot={AD_SLOTS.countryArticle} className="rounded-lg" />
            </div>

            {/* 사실 기반 narrative 6 섹션 */}
            {narrative && (() => {
              const sections: { title: string; body: string }[] = [
                { title: isKo ? '지리적 특징'   : 'Geography',              body: narrative.geography },
                { title: isKo ? '인구와 언어'   : 'Demographics & Languages', body: narrative.demographics },
                { title: isKo ? '경제 개요'     : 'Economy Overview',        body: narrative.economy },
                { title: isKo ? '문화와 시간대' : 'Culture & Time',          body: narrative.culture },
                { title: isKo ? '정부와 국제 지위' : 'Government & Status',  body: narrative.government },
                { title: isKo ? '실용 정보'     : 'Practical Information',   body: narrative.practical },
              ]
              return sections
                .filter(s => s.body && s.body.length > 0)
                .map(s => (
                  <section
                    key={s.title}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 16,
                      padding: '24px 32px',
                      marginTop: 16,
                    }}
                  >
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>
                      {s.title}
                    </h2>
                    <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.85, margin: 0 }}>
                      {s.body}
                    </p>
                  </section>
                ))
            })()}

            {/* 데이터 출처 & 방법론 (확장) */}
            <section style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16,
              padding: '24px 32px',
              marginTop: 16,
            }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>
                {isKo ? '데이터 출처와 산정 방식' : 'Data Sources & Methodology'}
              </h2>
              <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.85, margin: 0 }}>
                {isKo
                  ? `이 페이지의 GDP와 GDP 대비 부채 비율은 세계은행(World Bank) 공개 통계의 가장 최근 가용 연도 값을 사용했습니다. 실시간 부채 추산은 GDP × 부채 비율로 산출한 총 부채에 World Bank 실질금리(없을 경우 4% 기본값)를 적용해 1초당 이자 부담을 계산하는 방식입니다. 환율은 open.er-api.com에서 1시간마다, 국가 기본 정보(언어, 시간대, 국경, 도메인 등)는 REST Countries에서 24시간마다 가져옵니다. 모든 수치는 공개 통계 기반 추산이며, 실제 정부 공식 발표와는 차이가 있을 수 있습니다.`
                  : `GDP and debt-to-GDP figures on this page are pulled from the most recent available year of World Bank open statistics. The real-time debt estimate is computed by multiplying total debt (GDP × debt ratio) by World Bank's real interest rate (or a 4% fallback when unavailable) and dividing across each second of a year. Exchange rates refresh hourly via open.er-api.com, and country-level metadata such as languages, time zones, borders, and domains is fetched from REST Countries every 24 hours. All values are estimates derived from public datasets and may differ from official figures.`}
              </p>
            </section>
          </>
        )}

        {/* 다른 나라 탐험 (항상 표시) */}
        <div style={{ marginTop: 40 }}>
          <div style={{ fontSize: 11, color: '#334155', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
            {isKo ? '다른 나라 부채 보기' : 'Explore Other Countries'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {POPULAR_COUNTRIES.filter(c => c.code !== code.toLowerCase()).slice(0, 8).map(c => (
              <Link
                key={c.code}
                href={isKo ? `/ko/countries/${c.code}` : `/countries/${c.code}`}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  padding: '6px 14px',
                  fontSize: 13,
                  color: '#64748b',
                  textDecoration: 'none',
                  transition: 'color 0.15s',
                }}
              >
                {isKo ? c.nameKo : c.nameEn}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
