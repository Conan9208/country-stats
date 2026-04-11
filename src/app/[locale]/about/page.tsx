import type { Metadata } from 'next'
import Link from 'next/link'
import { Globe, BarChart2, ArrowLeftRight, Scale, Trophy, MessageCircle, Pin, Vote, AlertTriangle } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'About' })
  return {
    title: t('metaTitle'),
    description: t('metaDesc'),
  }
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'About' })

  const features = [
    { icon: <Globe size={16} className="text-zinc-500 shrink-0 mt-0.5" />, name: t('f1Name'), desc: t('f1Desc') },
    { icon: <BarChart2 size={16} className="text-zinc-500 shrink-0 mt-0.5" />, name: t('f2Name'), desc: t('f2Desc') },
    { icon: <ArrowLeftRight size={16} className="text-zinc-500 shrink-0 mt-0.5" />, name: t('f3Name'), desc: t('f3Desc') },
    { icon: <Scale size={16} className="text-zinc-500 shrink-0 mt-0.5" />, name: t('f4Name'), desc: t('f4Desc') },
    { icon: <Trophy size={16} className="text-zinc-500 shrink-0 mt-0.5" />, name: t('f5Name'), desc: t('f5Desc') },
    { icon: <Vote size={16} className="text-zinc-500 shrink-0 mt-0.5" />, name: t('f6Name'), desc: t('f6Desc') },
    { icon: <MessageCircle size={16} className="text-zinc-500 shrink-0 mt-0.5" />, name: t('f7Name'), desc: t('f7Desc') },
    { icon: <Pin size={16} className="text-zinc-500 shrink-0 mt-0.5" />, name: t('f8Name'), desc: t('f8Desc') },
  ]

  const commentRules = [t('commentRule1'), t('commentRule2'), t('commentRule3'), t('commentRule4')]
  const pinRules = [t('pinRule1'), t('pinRule2'), t('pinRule3'), t('pinRule4'), t('pinRule5')]

  const dataSources = [
    { name: t('data1Name'), desc: t('data1Desc') },
    { name: t('data2Name'), desc: t('data2Desc') },
    { name: t('data3Name'), desc: t('data3Desc') },
    { name: t('data4Name'), desc: t('data4Desc') },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* 헤더 */}
        <div className="mb-10">
          <Link href="/" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
            {t('backHome')}
          </Link>
          <h1 className="text-3xl font-bold text-white mt-6 flex items-center gap-2">
            <Globe size={28} /> {t('heading')}
          </h1>
          <p className="text-zinc-400 mt-2 text-sm">{t('subheading')}</p>
        </div>

        <div className="space-y-10 text-zinc-300 leading-relaxed">

          {/* 소개 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{t('whatIsTitle')}</h2>
            <p>{t('whatIsBody')}</p>
          </section>

          {/* 주요 기능 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{t('featuresTitle')}</h2>
            <ul className="space-y-2 text-sm">
              {features.map((f) => (
                <li key={f.name} className="flex gap-3">
                  {f.icon}
                  <span><strong className="text-zinc-200">{f.name}</strong> — {f.desc}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 커뮤니티 가이드라인 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-400" />
              {t('guidelineTitle')}
            </h2>
            <p className="text-xs text-zinc-500 mb-4">{t('guidelineSubtext')}</p>

            <div className="space-y-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle size={14} className="text-zinc-400" />
                  <span className="text-sm font-semibold text-zinc-200">{t('commentRulesTitle')}</span>
                </div>
                <ul className="space-y-1.5 text-sm text-zinc-400">
                  {commentRules.map((rule) => (
                    <li key={rule} className="flex gap-2">
                      <span className="text-zinc-600 shrink-0">·</span>
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Pin size={14} className="text-zinc-400" />
                  <span className="text-sm font-semibold text-zinc-200">{t('pinRulesTitle')}</span>
                </div>
                <ul className="space-y-1.5 text-sm text-zinc-400">
                  {pinRules.map((rule) => (
                    <li key={rule} className="flex gap-2">
                      <span className="text-zinc-600 shrink-0">·</span>
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-amber-950/30 border border-amber-900/40 rounded-xl p-4">
                <p className="text-sm text-amber-200/80">
                  {t('sanctionNotice')}
                  <Link href="/contact" className="underline underline-offset-2 hover:text-amber-100 transition-colors">
                    {t('sanctionContact')}
                  </Link>
                  {t('sanctionNotice2')}
                </p>
              </div>
            </div>
          </section>

          {/* 데이터 출처 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{t('dataTitle')}</h2>
            <ul className="space-y-1 text-sm">
              {dataSources.map((d) => (
                <li key={d.name} className="flex gap-2 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 flex-shrink-0 mt-0.5" />
                  <span><strong className="text-zinc-200">{d.name}</strong> — {d.desc}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 기술 스택 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{t('techTitle')}</h2>
            <p className="text-sm">{t('techList')}</p>
          </section>

          {/* 만든 사람 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">{t('authorTitle')}</h2>
            <p className="text-sm">{t('authorBody')}</p>
          </section>

        </div>

        {/* 푸터 링크 */}
        <div className="mt-16 pt-8 border-t border-zinc-800 flex gap-6 text-sm text-zinc-600">
          <Link href="/" className="hover:text-zinc-400 transition-colors">{t('footerHome')}</Link>
          <Link href="/privacy" className="hover:text-zinc-400 transition-colors">{t('footerPrivacy')}</Link>
          <Link href="/contact" className="hover:text-zinc-400 transition-colors">{t('footerContact')}</Link>
        </div>
      </div>
    </div>
  )
}
