import { Metadata } from 'next'
import Link from 'next/link'
import DebtTicker from './DebtTicker'

const BASE_URL = 'https://postmyglobe.com'
const WB = 'https://api.worldbank.org/v2'

// ─── 타입 ────────────────────────────────────────────────────────────────────

type CountryData = {
  code: string
  name: string
  flag: string
  currency: { code: string; symbol: string; name: string } | null
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
    fetch(`https://restcountries.com/v3.1/alpha/${upper}?fields=name,flags,currencies,region`, {
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

  if (countryRes.status === 'fulfilled' && countryRes.value.ok) {
    const raw  = await countryRes.value.json()
    const c    = Array.isArray(raw) ? raw[0] : raw
    const entries = Object.entries(c?.currencies ?? {}) as [string, { symbol?: string; name?: string }][]
    const [cCode, cMeta] = entries[0] ?? []
    countryName = c?.name?.common ?? upper
    flagUrl     = c?.flags?.svg ?? ''
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

  const datasetJsonLd = data
    ? {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: isKo ? `${data.name} 국가 부채 통계` : `${data.name} National Debt Statistics`,
        description: isKo
          ? `${data.name}의 국가 부채 실시간 추산. GDP 대비 ${data.debtRatio.toFixed(1)}%.`
          : `Real-time national debt estimate for ${data.name}. Debt-to-GDP: ${data.debtRatio.toFixed(1)}%.`,
        url: pageUrl,
        variableMeasured: [
          { '@type': 'PropertyValue', name: 'GDP (USD)',              value: data.gdpUSD },
          { '@type': 'PropertyValue', name: 'Debt-to-GDP Ratio (%)', value: data.debtRatio },
          { '@type': 'PropertyValue', name: 'Annual Interest Rate (%)', value: data.interestRate },
        ],
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
          href="/?tab=map"
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
          </>
        )}
      </div>
    </main>
  )
}
