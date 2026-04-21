import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { NextIntlClientProvider } from 'next-intl';
import Script from 'next/script';
import AdSenseLoader from '@/components/AdSenseLoader';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';

const BASE_URL = 'https://postmyglobe.com'


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  const isKo = locale === 'ko'

  const title = isKo
    ? '글로브 포스트 | 세계 국가 통계'
    : 'GlobePost | Country Stats'

  const description = isKo
    ? '3D 지구본으로 세계 195개 국가를 탐험하세요. 국가 부채 실시간, GDP, 환율, 국가 비교 정보를 한눈에.'
    : 'Explore 195 countries on an interactive 3D globe. Real-time national debt, GDP, exchange rates, and country comparisons.'

  const url = locale === 'en' ? BASE_URL : `${BASE_URL}/${locale}`

  return {
    title,
    description,
    metadataBase: new URL(BASE_URL),
    alternates: {
      canonical: url,
      languages: {
        ko: `${BASE_URL}/ko`,
        en: BASE_URL,
        'x-default': BASE_URL,
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: 'PostMyGlobe',
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: 'PostMyGlobe — Interactive 3D Globe',
        },
      ],
      type: 'website',
      locale: isKo ? 'ko_KR' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.png'],
    },
  }
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }
  
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bangers&family=Bungee&family=Pacifico&family=Montserrat:wght@600;700;800&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" />
        <meta name="google-adsense-account" content="ca-pub-8766166885849764" />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages} locale={locale}>
          {children}
        </NextIntlClientProvider>
        <AdSenseLoader />
        {/* Google Analytics 4 */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-G8DS3NGS65" strategy="afterInteractive" />
        <Script id="ga4-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-G8DS3NGS65');
        `}</Script>
      </body>
    </html>
  );
}
