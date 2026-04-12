import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Privacy' })
  return {
    title: t('metaTitle'),
    description: t('metaDesc'),
  }
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'Privacy' })

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">

        <div className="mb-10">
          <Link href="/" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
            {t('backHome')}
          </Link>
          <h1 className="text-3xl font-bold text-white mt-6">{t('heading')}</h1>
          <p className="text-zinc-500 mt-2 text-sm">{t('lastUpdated')}</p>
        </div>

        <div className="space-y-10 text-zinc-300 leading-relaxed text-sm">

          <section>
            <p>{t('intro')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">{t('section1Title')}</h2>
            <p className="mb-3">{t('section1Intro')}</p>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <span className="text-zinc-500 flex-shrink-0">•</span>
                <span><strong className="text-zinc-200">{t('ipTitle')}</strong> — {t('ipDesc')}</span>
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-500 flex-shrink-0">•</span>
                <span><strong className="text-zinc-200">{t('clickDataTitle')}</strong> — {t('clickDataDesc')}</span>
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-500 flex-shrink-0">•</span>
                <span><strong className="text-zinc-200">{t('commentsTitle')}</strong> — {t('commentsDesc')}</span>
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-500 flex-shrink-0">•</span>
                <span><strong className="text-zinc-200">{t('localStorageTitle')}</strong> — {t('localStorageDesc')}</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">{t('section2Title')}</h2>
            <ul className="space-y-1">
              <li className="flex gap-2"><span className="text-zinc-500">•</span><span>{t('purpose1')}</span></li>
              <li className="flex gap-2"><span className="text-zinc-500">•</span><span>{t('purpose2')}</span></li>
              <li className="flex gap-2"><span className="text-zinc-500">•</span><span>{t('purpose3')}</span></li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">{t('section3Title')}</h2>
            <p className="mb-3">{t('section3Intro')}</p>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <span className="text-zinc-500 flex-shrink-0">•</span>
                <span>
                  <strong className="text-zinc-200">{t('supabaseTitle')}</strong> — {t('supabaseDesc')} (
                  <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{t('privacyPolicy')}</a>
                  )
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-500 flex-shrink-0">•</span>
                <span>
                  <strong className="text-zinc-200">{t('vercelTitle')}</strong> — {t('vercelDesc')} (
                  <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{t('privacyPolicy')}</a>
                  )
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-500 flex-shrink-0">•</span>
                <span>
                  <strong className="text-zinc-200">{t('googleAdSenseTitle')}</strong> — {t('googleAdSenseDesc')} (
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{t('googlePrivacyPolicy')}</a>
                  )
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-500 flex-shrink-0">•</span>
                <span><strong className="text-zinc-200">{t('googleFontsTitle')}</strong> — {t('googleFontsDesc')}</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">{t('section4Title')}</h2>
            <p>{t('section4Desc')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">{t('section5Title')}</h2>
            <ul className="space-y-1">
              <li className="flex gap-2"><span className="text-zinc-500">•</span><span>{t('retention1')}</span></li>
              <li className="flex gap-2"><span className="text-zinc-500">•</span><span>{t('retention2')}</span></li>
              <li className="flex gap-2"><span className="text-zinc-500">•</span><span>{t('retention3')}</span></li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">{t('section6Title')}</h2>
            <p>
              {t('section6Desc')}
              <Link href="/contact" className="text-blue-400 hover:underline">{t('contactLink')}</Link>
              {t('section6Desc2')}
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">{t('section7Title')}</h2>
            <p>{t('section7Desc')}</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">{t('section8Title')}</h2>
            <p>
              {t('section8Desc')}
              <Link href="/contact" className="text-blue-400 hover:underline">{t('contactLink')}</Link>
              {t('section8Desc2')}
            </p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-zinc-800 flex gap-6 text-sm text-zinc-600">
          <Link href="/" className="hover:text-zinc-400 transition-colors">{t('footerHome')}</Link>
          <Link href="/about" className="hover:text-zinc-400 transition-colors">{t('footerAbout')}</Link>
          <Link href="/contact" className="hover:text-zinc-400 transition-colors">{t('footerContact')}</Link>
        </div>
      </div>
    </div>
  )
}
