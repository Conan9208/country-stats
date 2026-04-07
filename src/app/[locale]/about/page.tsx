import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About — WorldStats',
  description: 'WorldStats는 전 세계 국가의 통계 정보를 한눈에 비교할 수 있는 인터랙티브 플랫폼입니다.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* 헤더 */}
        <div className="mb-10">
          <Link href="/" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
            ← WorldStats 홈으로
          </Link>
          <h1 className="text-3xl font-bold text-white mt-6">🌍 About WorldStats</h1>
          <p className="text-zinc-400 mt-2 text-sm">글로벌 국가 비교 통계 플랫폼</p>
        </div>

        <div className="space-y-10 text-zinc-300 leading-relaxed">

          {/* 소개 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">WorldStats란?</h2>
            <p>
              WorldStats는 전 세계 200개 이상의 국가에 대한 통계 정보를 시각적으로 탐색할 수 있는
              인터랙티브 플랫폼입니다. 인구, 면적, 경제 지표, 국가 부채 등 다양한 데이터를 직관적인
              인터페이스로 제공합니다.
            </p>
          </section>

          {/* 주요 기능 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">주요 기능</h2>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-3">
                <span className="text-zinc-500 w-5">🌐</span>
                <span><strong className="text-zinc-200">인터랙티브 지구본</strong> — 3D 지구본에서 국가를 직접 클릭하고 탐색합니다. 클릭 수는 전 세계 사용자와 실시간으로 공유됩니다.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-zinc-500 w-5">📊</span>
                <span><strong className="text-zinc-200">국가 상세 정보</strong> — 수도, 인구, 면적, 공용어, 통화 등 각국의 기본 정보를 확인할 수 있습니다.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-zinc-500 w-5">💸</span>
                <span><strong className="text-zinc-200">실시간 국가 부채</strong> — World Bank 데이터를 기반으로 국가별 부채 현황을 실시간으로 시각화합니다.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-zinc-500 w-5">💱</span>
                <span><strong className="text-zinc-200">환율 계산기</strong> — 실시간 환율 데이터로 각국 통화 간 환산을 지원합니다.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-zinc-500 w-5">⚖️</span>
                <span><strong className="text-zinc-200">국가 비교</strong> — 두 나라를 나란히 놓고 인구, 면적, 언어 등을 비교합니다.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-zinc-500 w-5">🏆</span>
                <span><strong className="text-zinc-200">세계 순위</strong> — 인구 및 면적 기준 국가 랭킹을 지역별로 필터링해 볼 수 있습니다.</span>
              </li>
            </ul>
          </section>

          {/* 데이터 출처 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">데이터 출처</h2>
            <ul className="space-y-1 text-sm">
              <li className="flex gap-2 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 flex-shrink-0 mt-0.5" />
                <span><strong className="text-zinc-200">REST Countries API</strong> — 국가 기본 정보 (restcountries.com)</span>
              </li>
              <li className="flex gap-2 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 flex-shrink-0 mt-0.5" />
                <span><strong className="text-zinc-200">World Bank API</strong> — GDP, 부채 비율, 금리 등 경제 지표</span>
              </li>
              <li className="flex gap-2 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 flex-shrink-0 mt-0.5" />
                <span><strong className="text-zinc-200">Open Exchange Rates</strong> — 실시간 환율 데이터 (open.er-api.com)</span>
              </li>
              <li className="flex gap-2 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 flex-shrink-0 mt-0.5" />
                <span><strong className="text-zinc-200">Natural Earth / World Atlas</strong> — 지도 GeoJSON 데이터</span>
              </li>
            </ul>
          </section>

          {/* 기술 스택 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">기술 스택</h2>
            <p className="text-sm">
              Next.js (App Router) · TypeScript · Tailwind CSS · Supabase · D3.js · Vercel
            </p>
          </section>

          {/* 만든 사람 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">만든 사람</h2>
            <p className="text-sm">
              WorldStats는 국가 데이터에 대한 관심에서 출발한 개인 프로젝트입니다.
              더 많은 기능이 꾸준히 추가되고 있습니다.
            </p>
          </section>

        </div>

        {/* 푸터 링크 */}
        <div className="mt-16 pt-8 border-t border-zinc-800 flex gap-6 text-sm text-zinc-600">
          <Link href="/" className="hover:text-zinc-400 transition-colors">홈</Link>
          <Link href="/privacy" className="hover:text-zinc-400 transition-colors">개인정보처리방침</Link>
          <Link href="/contact" className="hover:text-zinc-400 transition-colors">문의</Link>
        </div>
      </div>
    </div>
  )
}
