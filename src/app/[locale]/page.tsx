import Link from 'next/link'
import HomeClientWrapper from './HomeClientWrapper'

const TOP_COUNTRIES = [
  { code: 'us', nameKo: '미국', nameEn: 'United States' },
  { code: 'jp', nameKo: '일본', nameEn: 'Japan' },
  { code: 'cn', nameKo: '중국', nameEn: 'China' },
  { code: 'kr', nameKo: '한국', nameEn: 'South Korea' },
  { code: 'de', nameKo: '독일', nameEn: 'Germany' },
  { code: 'gb', nameKo: '영국', nameEn: 'United Kingdom' },
  { code: 'fr', nameKo: '프랑스', nameEn: 'France' },
  { code: 'in', nameKo: '인도', nameEn: 'India' },
]

const TOP_TRAVEL = [
  { from: 'KR', to: 'US', labelKo: '한국 → 미국', labelEn: 'Korea → USA' },
  { from: 'KR', to: 'JP', labelKo: '한국 → 일본', labelEn: 'Korea → Japan' },
  { from: 'KR', to: 'TH', labelKo: '한국 → 태국', labelEn: 'Korea → Thailand' },
  { from: 'US', to: 'JP', labelKo: '미국 → 일본', labelEn: 'USA → Japan' },
]

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const isKo = locale === 'ko'
  const base = isKo ? '/ko' : ''

  return (
    <>
      {/* 인터랙티브 글로브 UI (클라이언트 전용) */}
      <HomeClientWrapper />

      {/* SSR 콘텐츠: 구글봇이 읽는 게시자 콘텐츠 — 글로브 아래 스크롤 영역 */}
      <section
        className="bg-zinc-900 text-white px-6 py-12 border-t border-zinc-800"
        aria-label={isKo ? '사이트 안내' : 'Site overview'}
      >
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-3">
            PostMyGlobe —{' '}
            {isKo
              ? '실시간 세계 국가 부채 & 여행 정보'
              : 'Live National Debt Clocks & Travel Info'}
          </h1>
          <p className="text-zinc-400 mb-8 leading-relaxed">
            {isKo
              ? '195개국의 실시간 국가 부채, 1인당 GDP, 금리 데이터를 인터랙티브 3D 지구본으로 탐험하세요. 세계은행(World Bank) 공식 데이터 기반으로 매일 업데이트됩니다.'
              : 'Explore live national debt clocks, GDP per capita, and interest rate data for 195 countries on an interactive 3D globe. Updated daily with official World Bank data.'}
          </p>

          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
            {isKo ? '인기 국가 부채 현황' : 'Popular Country Debt Clocks'}
          </h2>
          <ul className="flex flex-wrap gap-2 mb-10">
            {TOP_COUNTRIES.map(c => (
              <li key={c.code}>
                <Link
                  href={`${base}/countries/${c.code}`}
                  className="px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 hover:text-white transition-colors"
                >
                  {isKo ? c.nameKo : c.nameEn}
                </Link>
              </li>
            ))}
          </ul>

          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
            {isKo ? '인기 여행 정보' : 'Popular Travel Routes'}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {TOP_TRAVEL.map(r => (
              <li key={`${r.from}-${r.to}`}>
                <Link
                  href={`${base}/travel/${r.from}/${r.to}`}
                  className="px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 hover:text-white transition-colors"
                >
                  {isKo ? r.labelKo : r.labelEn}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}
