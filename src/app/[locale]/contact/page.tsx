import type { Metadata } from 'next'
import Link from 'next/link'
import { Bug, BarChart2, Trash2, Lightbulb } from 'lucide-react'

export const metadata: Metadata = {
  title: '문의 — WorldStats',
  description: 'WorldStats에 대한 문의, 버그 신고, 기능 제안을 남겨주세요.',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* 헤더 */}
        <div className="mb-10">
          <Link href="/" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
            ← WorldStats 홈으로
          </Link>
          <h1 className="text-3xl font-bold text-white mt-6">문의하기</h1>
          <p className="text-zinc-400 mt-2 text-sm">버그 신고, 기능 제안, 데이터 오류 제보 등 무엇이든 환영합니다.</p>
        </div>

        <div className="space-y-8 text-zinc-300 text-sm leading-relaxed">

          {/* 문의 방법 */}
          <section className="space-y-4">

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-2">
              <div className="flex items-center gap-3 mb-1">
                <Bug size={18} className="text-zinc-400 shrink-0" />
                <h2 className="text-base font-semibold text-white">버그 신고 / 기능 제안</h2>
              </div>
              <p className="text-zinc-400">
                GitHub Issues를 통해 버그를 신고하거나 새로운 기능을 제안할 수 있습니다.
                재현 방법, 사용 브라우저, 스크린샷을 함께 남겨주시면 더 빠르게 처리됩니다.
              </p>
              <a
                href="https://github.com/Conan9208/country-stats/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-200 transition-colors text-xs font-medium"
              >
                GitHub Issues 바로가기 →
              </a>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-2">
              <div className="flex items-center gap-3 mb-1">
                <BarChart2 size={18} className="text-zinc-400 shrink-0" />
                <h2 className="text-base font-semibold text-white">데이터 오류 제보</h2>
              </div>
              <p className="text-zinc-400">
                국가 정보나 통계 수치가 잘못되었다면 알려주세요. 데이터 출처와 올바른 정보를
                함께 제보해주시면 빠르게 반영하겠습니다.
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-2">
              <div className="flex items-center gap-3 mb-1">
                <Trash2 size={18} className="text-zinc-400 shrink-0" />
                <h2 className="text-base font-semibold text-white">댓글 삭제 요청</h2>
              </div>
              <p className="text-zinc-400">
                본인이 작성한 댓글의 삭제를 원하시면 GitHub Issues를 통해 요청해주세요.
                해당 댓글의 국가명과 작성 내용을 함께 남겨주시면 확인 후 삭제해드립니다.
              </p>
            </div>

          </section>

          {/* 응답 시간 안내 */}
          <section className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4 text-zinc-500 text-xs">
            <span className="flex items-start gap-2"><Lightbulb size={13} className="shrink-0 mt-0.5" />WorldStats는 개인이 운영하는 프로젝트입니다. 문의에 대한 응답은 수일이 소요될 수 있습니다.</span>
          </section>

        </div>

        {/* 푸터 링크 */}
        <div className="mt-16 pt-8 border-t border-zinc-800 flex gap-6 text-sm text-zinc-600">
          <Link href="/" className="hover:text-zinc-400 transition-colors">홈</Link>
          <Link href="/about" className="hover:text-zinc-400 transition-colors">서비스 소개</Link>
          <Link href="/privacy" className="hover:text-zinc-400 transition-colors">개인정보처리방침</Link>
        </div>
      </div>
    </div>
  )
}
