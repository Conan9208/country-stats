import { Metadata } from 'next'
import Link from 'next/link'
import worldCountries from 'world-countries'
import { COUNTRY_POPULATION } from '@/data/countryPopulation'

const BASE_URL = 'https://postmyglobe.com'

type CountryRank = {
  cca2: string
  name: { common: string }
  population: number
  area: number
  flags: { svg: string }
  region: string
}

// 오프라인 번들 기반 랭킹 (restcountries.com 다운 대응).
// 인구는 World Bank 스냅샷, 면적/이름은 world-countries.
// UN 회원국·독립국만 포함해 남극·속령이 면적 랭킹을 오염시키지 않도록 한다.
function getRankings(): CountryRank[] {
  return worldCountries
    .filter(c => c.unMember || c.independent)
    .map(c => {
      const cc = c.cca2.toUpperCase()
      return {
        cca2: c.cca2,
        name: { common: c.name.common },
        population: COUNTRY_POPULATION[cc] ?? 0,
        area: typeof c.area === 'number' && c.area > 0 ? c.area : 0,
        flags: { svg: `https://flagcdn.com/${c.cca2.toLowerCase()}.svg` },
        region: c.region ?? '',
      }
    })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const isKo = locale === 'ko'
  const pageUrl = isKo ? `${BASE_URL}/ko/rankings` : `${BASE_URL}/rankings`
  const title = isKo
    ? '세계 국가 랭킹 — 인구·면적 Top 20 | PostMyGlobe'
    : 'World Country Rankings — Top 20 by Population & Area | PostMyGlobe'
  const description = isKo
    ? '세계 195개국의 인구 및 면적 순위 Top 20. 실시간 국가 통계를 한눈에 확인하세요.'
    : 'Top 20 countries by population and land area. Explore world country statistics at a glance.'

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
      languages: {
        ko: `${BASE_URL}/ko/rankings`,
        en: `${BASE_URL}/rankings`,
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

function formatPop(n: number, locale: string): string {
  if (n >= 1e9) return locale === 'ko' ? `${(n / 1e9).toFixed(2)}억 명` : `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return locale === 'ko' ? `${(n / 1e6).toFixed(1)}백만 명` : `${(n / 1e6).toFixed(1)}M`
  return n.toLocaleString()
}

function formatArea(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M km²`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K km²`
  return `${n.toLocaleString()} km²`
}

export default async function RankingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const isKo = locale === 'ko'
  const all = getRankings()

  const byPop = [...all]
    .filter(c => c.population > 0)
    .sort((a, b) => b.population - a.population)
    .slice(0, 20)

  const byArea = [...all]
    .filter(c => c.area > 0)
    .sort((a, b) => b.area - a.area)
    .slice(0, 20)

  const popListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: isKo ? '세계 인구 Top 20' : 'Top 20 Countries by Population',
    url: isKo ? `${BASE_URL}/ko/rankings` : `${BASE_URL}/rankings`,
    numberOfItems: 20,
    itemListElement: byPop.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name.common,
      description: formatPop(c.population, locale),
    })),
  }

  const cellStyle: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: 13,
    color: '#94a3b8',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  }

  const headerCellStyle: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: 11,
    color: '#475569',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  }

  return (
    <main style={{ minHeight: '100vh', background: '#050a10', color: '#f1f5f9', fontFamily: 'inherit' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(popListJsonLd) }}
      />

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
          href="/"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            color: '#94a3b8',
            padding: '5px 12px',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            textDecoration: 'none',
          }}
        >
          ← {isKo ? '지구본으로' : 'Back to Globe'}
        </Link>
        <span style={{ fontWeight: 700, fontSize: 15 }}>
          {isKo ? '세계 국가 랭킹' : 'World Country Rankings'}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: '#1e3a5f', fontWeight: 700 }}>🌍 PostMyGlobe</span>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>

        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: '#f1f5f9' }}>
          {isKo ? '세계 국가 통계 랭킹' : 'World Country Statistics Rankings'}
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 40, lineHeight: 1.7 }}>
          {isKo
            ? '전 세계 195개국의 인구 및 면적 기준 순위입니다. 나라 이름을 클릭하면 해당 국가의 부채 정보를 볼 수 있어요.'
            : 'Rankings of 195 countries worldwide by population and land area. Click a country name to view its national debt data.'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 32 }}>

          {/* 인구 랭킹 */}
          <section>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
              👥 {isKo ? '인구 Top 20' : 'Top 20 by Population'}
            </h2>
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14,
              overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...headerCellStyle, width: 36, textAlign: 'center' }}>#</th>
                    <th style={{ ...headerCellStyle, textAlign: 'left' }}>{isKo ? '국가' : 'Country'}</th>
                    <th style={{ ...headerCellStyle, textAlign: 'right' }}>{isKo ? '인구' : 'Population'}</th>
                  </tr>
                </thead>
                <tbody>
                  {byPop.map((c, i) => (
                    <tr key={c.cca2}>
                      <td style={{ ...cellStyle, textAlign: 'center', color: i < 3 ? '#a78bfa' : '#334155', fontWeight: i < 3 ? 700 : 400 }}>
                        {i + 1}
                      </td>
                      <td style={{ ...cellStyle }}>
                        <Link
                          href={isKo ? `/ko/countries/${c.cca2.toLowerCase()}` : `/countries/${c.cca2.toLowerCase()}`}
                          style={{ color: '#cbd5e1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                          {c.flags?.svg && (
                            <img src={c.flags.svg} alt="" style={{ height: 14, borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)' }} />
                          )}
                          {c.name.common}
                        </Link>
                      </td>
                      <td style={{ ...cellStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#64748b' }}>
                        {formatPop(c.population, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 면적 랭킹 */}
          <section>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
              🗺️ {isKo ? '면적 Top 20' : 'Top 20 by Area'}
            </h2>
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14,
              overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...headerCellStyle, width: 36, textAlign: 'center' }}>#</th>
                    <th style={{ ...headerCellStyle, textAlign: 'left' }}>{isKo ? '국가' : 'Country'}</th>
                    <th style={{ ...headerCellStyle, textAlign: 'right' }}>{isKo ? '면적' : 'Area'}</th>
                  </tr>
                </thead>
                <tbody>
                  {byArea.map((c, i) => (
                    <tr key={c.cca2}>
                      <td style={{ ...cellStyle, textAlign: 'center', color: i < 3 ? '#60a5fa' : '#334155', fontWeight: i < 3 ? 700 : 400 }}>
                        {i + 1}
                      </td>
                      <td style={{ ...cellStyle }}>
                        <Link
                          href={isKo ? `/ko/countries/${c.cca2.toLowerCase()}` : `/countries/${c.cca2.toLowerCase()}`}
                          style={{ color: '#cbd5e1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                          {c.flags?.svg && (
                            <img src={c.flags.svg} alt="" style={{ height: 14, borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)' }} />
                          )}
                          {c.name.common}
                        </Link>
                      </td>
                      <td style={{ ...cellStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#64748b' }}>
                        {formatArea(c.area)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </div>

        {/* 출처 + 탐험 링크 */}
        <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: 12, color: '#1e293b', textAlign: 'center', marginBottom: 24 }}>
            {isKo
              ? '데이터 출처: World Bank (인구) · REST Countries (면적)'
              : 'Data source: World Bank (population) · REST Countries (area)'}
          </p>
          <div style={{ textAlign: 'center' }}>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(139,92,246,0.1)',
                border: '1px solid rgba(139,92,246,0.25)',
                borderRadius: 10,
                padding: '10px 20px',
                fontSize: 14,
                color: '#a78bfa',
                textDecoration: 'none',
              }}
            >
              🌍 {isKo ? '지구본으로 탐험하기' : 'Explore on the 3D Globe'}
            </Link>
          </div>
        </div>

      </div>
    </main>
  )
}
