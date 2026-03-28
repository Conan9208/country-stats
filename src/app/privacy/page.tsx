import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '개인정보처리방침 — WorldStats',
  description: 'WorldStats 개인정보처리방침. 수집하는 정보, 이용 목적, 제3자 서비스에 대해 안내합니다.',
}

const LAST_UPDATED = '2026년 3월 28일'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* 헤더 */}
        <div className="mb-10">
          <Link href="/" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
            ← WorldStats 홈으로
          </Link>
          <h1 className="text-3xl font-bold text-white mt-6">개인정보처리방침</h1>
          <p className="text-zinc-500 mt-2 text-sm">최종 수정일: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-10 text-zinc-300 leading-relaxed text-sm">

          <section>
            <p>
              WorldStats(이하 "서비스")는 이용자의 개인정보를 소중히 여기며, 관련 법령을 준수합니다.
              본 방침은 서비스가 수집하는 정보와 그 활용 방식을 설명합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">1. 수집하는 정보</h2>
            <p className="mb-3">서비스는 이용자 식별을 위한 계정을 요구하지 않습니다. 다음과 같은 최소한의 정보만 처리됩니다.</p>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <span className="text-zinc-500 flex-shrink-0">•</span>
                <span><strong className="text-zinc-200">IP 주소 (해시 처리)</strong> — 클릭 횟수 제한(Rate Limit) 및 댓글 스팸 방지를 위해 IP 주소를 단방향 해시(SHA-256)로 변환하여 저장합니다. 원본 IP는 저장하지 않습니다.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-500 flex-shrink-0">•</span>
                <span><strong className="text-zinc-200">클릭 데이터</strong> — 어느 국가가 몇 번 클릭되었는지 집계 데이터를 저장합니다. 특정 이용자와 연결되지 않습니다.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-500 flex-shrink-0">•</span>
                <span><strong className="text-zinc-200">댓글</strong> — 이용자가 직접 작성하여 제출한 텍스트. 닉네임 또는 익명으로 표시됩니다.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-500 flex-shrink-0">•</span>
                <span><strong className="text-zinc-200">로컬 스토리지</strong> — 이용자가 클릭한 국가 목록은 브라우저 로컬 스토리지에만 저장되며 서버로 전송되지 않습니다.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">2. 정보의 이용 목적</h2>
            <ul className="space-y-1">
              <li className="flex gap-2"><span className="text-zinc-500">•</span><span>국가별 클릭 랭킹 집계 및 실시간 통계 제공</span></li>
              <li className="flex gap-2"><span className="text-zinc-500">•</span><span>어뷰징(과도한 클릭, 스팸) 방지</span></li>
              <li className="flex gap-2"><span className="text-zinc-500">•</span><span>서비스 품질 개선 및 오류 대응</span></li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">3. 제3자 서비스</h2>
            <p className="mb-3">서비스는 다음 제3자 서비스를 이용합니다. 각 서비스의 개인정보처리방침을 확인하시기 바랍니다.</p>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <span className="text-zinc-500 flex-shrink-0">•</span>
                <span><strong className="text-zinc-200">Supabase</strong> — 데이터베이스 및 실시간 기능. 클릭 수, 댓글 데이터를 저장합니다. (<a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">개인정보방침</a>)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-500 flex-shrink-0">•</span>
                <span><strong className="text-zinc-200">Vercel</strong> — 호스팅 및 엣지 네트워크. 서버 요청 로그가 일시적으로 처리될 수 있습니다. (<a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">개인정보방침</a>)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-500 flex-shrink-0">•</span>
                <span><strong className="text-zinc-200">Google AdSense</strong> — 광고 서비스. Google은 서비스 이용 정보를 기반으로 맞춤 광고를 제공할 수 있으며, 쿠키를 사용합니다. (<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google 개인정보방침</a>)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-500 flex-shrink-0">•</span>
                <span><strong className="text-zinc-200">Google Fonts</strong> — 폰트 로딩 시 Google 서버에 요청이 발생할 수 있습니다.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">4. 쿠키</h2>
            <p>
              서비스 자체는 쿠키를 직접 생성하지 않습니다. 단, Google AdSense 등 제3자 광고 서비스가
              광고 맞춤화를 위해 쿠키를 사용할 수 있습니다. 브라우저 설정에서 쿠키를 거부할 수 있으나,
              일부 기능이 제한될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">5. 데이터 보관 기간</h2>
            <ul className="space-y-1">
              <li className="flex gap-2"><span className="text-zinc-500">•</span><span>클릭 집계 데이터: 서비스 운영 기간 동안 보관</span></li>
              <li className="flex gap-2"><span className="text-zinc-500">•</span><span>댓글: 작성 후 서비스 운영 기간 동안 보관. 이용자 요청 시 삭제</span></li>
              <li className="flex gap-2"><span className="text-zinc-500">•</span><span>IP 해시: Rate Limit 만료 후 자동 삭제 (최대 24시간)</span></li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">6. 이용자의 권리</h2>
            <p>
              이용자는 본인이 작성한 댓글의 삭제를 요청할 권리가 있습니다.
              문의 및 삭제 요청은 <Link href="/contact" className="text-blue-400 hover:underline">문의 페이지</Link>를 통해 접수해주세요.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">7. 방침 변경</h2>
            <p>
              본 방침은 서비스 변경에 따라 업데이트될 수 있습니다. 변경 시 본 페이지 상단의
              수정일이 갱신됩니다. 중요한 변경 사항은 서비스 내 공지로 안내할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">8. 문의</h2>
            <p>
              개인정보 관련 문의는 <Link href="/contact" className="text-blue-400 hover:underline">문의 페이지</Link>를 통해 접수해주세요.
            </p>
          </section>

        </div>

        {/* 푸터 링크 */}
        <div className="mt-16 pt-8 border-t border-zinc-800 flex gap-6 text-sm text-zinc-600">
          <Link href="/" className="hover:text-zinc-400 transition-colors">홈</Link>
          <Link href="/about" className="hover:text-zinc-400 transition-colors">서비스 소개</Link>
          <Link href="/contact" className="hover:text-zinc-400 transition-colors">문의</Link>
        </div>
      </div>
    </div>
  )
}
