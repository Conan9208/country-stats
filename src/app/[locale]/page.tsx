import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import HomeClientWrapper from './HomeClientWrapper'
import AdSlot from '@/components/AdSlot'
import { AD_SLOTS } from '@/lib/adSlots'

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

const RETURN_REASONS = [
  {
    titleKo: '매일 바뀌는 국가 투표',
    titleEn: 'Daily country vote',
    descKo: '하루 한 번 새로운 질문에 투표하고 전 세계 사용자의 선택 이유를 볼 수 있습니다.',
    descEn: 'Vote once a day on a new country prompt and read why people around the world chose their answer.',
  },
  {
    titleKo: '실시간 랭킹과 피드',
    titleEn: 'Live rankings and feed',
    descKo: '국가 클릭 순위, 댓글, 투표 이유가 실시간으로 쌓여 다시 방문할수록 볼거리가 늘어납니다.',
    descEn: 'Country clicks, comments, and vote reasons build up in real time, so repeat visits reveal new activity.',
  },
  {
    titleKo: '여행 준비용 빠른 비교',
    titleEn: 'Fast travel comparison',
    descKo: '비자, 환율, 시차, 날씨, 전압 정보를 한 화면에서 비교할 수 있습니다.',
    descEn: 'Compare visa, exchange rate, time difference, weather, and voltage information in one view.',
  },
]

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'Home' })
  const isKo = locale === 'ko'
  const base = isKo ? '/ko' : ''

  const faqs = [
    { q: t('faq1Q'), a: t('faq1A') },
    { q: t('faq2Q'), a: t('faq2A') },
    { q: t('faq3Q'), a: t('faq3A') },
    { q: t('faq4Q'), a: t('faq4A') },
  ]

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* 인터랙티브 글로브 (자체 viewport 차지) */}
      <HomeClientWrapper />

      {/* 글로브 아래로 스크롤되는 SSR 콘텐츠 */}
      <main className="bg-zinc-950 text-white">

        {/* Hero 텍스트 */}
        <section className="border-t border-zinc-800 px-6 py-14">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
              {t('heroTitle')}
            </h1>
            <p className="text-zinc-400 text-base sm:text-lg leading-relaxed">
              {t('heroLead')}
            </p>
          </div>
        </section>

        {/* What is */}
        <section className="px-6 py-12 border-t border-zinc-900">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold mb-3">{t('whatIsTitle')}</h2>
            <p className="text-zinc-400 leading-relaxed">{t('whatIsBody')}</p>
          </div>
        </section>

        {/* Features */}
        <section className="px-6 py-12 border-t border-zinc-900">
          <div className="max-w-4xl mx-auto">
            <div className="grid gap-3 sm:grid-cols-3">
              {RETURN_REASONS.map((item) => (
                <div key={item.titleEn} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                  <h3 className="text-sm font-semibold text-zinc-100 mb-2">
                    {isKo ? item.titleKo : item.titleEn}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {isKo ? item.descKo : item.descEn}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Popular country pages */}
        <section className="px-6 py-12 border-t border-zinc-900">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              {t('popularCountriesTitle')}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {TOP_COUNTRIES.map((c) => (
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
          </div>
        </section>

        {/* Popular travel routes */}
        <section className="px-6 py-12 border-t border-zinc-900">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              {t('popularTravelTitle')}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {TOP_TRAVEL.map((r) => (
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

        {/* How data */}
        <section className="px-6 py-12 border-t border-zinc-900">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold mb-3">{t('howDataTitle')}</h2>
            <p className="text-zinc-400 leading-relaxed">{t('howDataBody')}</p>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 py-12 border-t border-zinc-900">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold mb-6">{t('faqTitle')}</h2>
            <div className="space-y-5">
              {faqs.map((f) => (
                <div key={f.q} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
                  <h3 className="text-base font-medium text-zinc-100 mb-2">{f.q}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
            <div className="mt-10">
              <AdSlot slot={AD_SLOTS.homeBottom} className="rounded-lg" />
            </div>
          </div>
        </section>

        {/* Footer links */}
        <footer className="px-6 py-10 border-t border-zinc-800">
          <div className="max-w-4xl mx-auto flex flex-wrap gap-6 text-sm text-zinc-600">
            <Link href={`${base}/about`} className="hover:text-zinc-400 transition-colors">
              {isKo ? '서비스 소개' : 'About'}
            </Link>
            <Link href={`${base}/privacy`} className="hover:text-zinc-400 transition-colors">
              {isKo ? '개인정보처리방침' : 'Privacy'}
            </Link>
            <Link href={`${base}/terms`} className="hover:text-zinc-400 transition-colors">
              {isKo ? '이용약관' : 'Terms'}
            </Link>
            <Link href={`${base}/contact`} className="hover:text-zinc-400 transition-colors">
              {isKo ? '문의' : 'Contact'}
            </Link>
          </div>
        </footer>
      </main>
    </>
  )
}
