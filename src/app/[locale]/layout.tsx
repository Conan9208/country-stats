import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import Script from 'next/script';
import { NextIntlClientProvider } from 'next-intl';
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
    ? '세계 나라 통계 & 부채 실시간 | PostMyGlobe'
    : 'Interactive 3D World Globe | Country Stats & Debt Clock | PostMyGlobe'

  const description = isKo
    ? '3D 지구본으로 세계 195개 국가를 탐험하세요. 국가 부채 실시간, GDP, 환율, 국가 비교 정보를 한눈에.'
    : 'Explore 195 countries on an interactive 3D globe. Real-time national debt, GDP, exchange rates, and country comparisons.'

  const url = `${BASE_URL}/${locale}`

  return {
    title,
    description,
    metadataBase: new URL(BASE_URL),
    alternates: {
      canonical: url,
      languages: {
        ko: `${BASE_URL}/ko`,
        en: `${BASE_URL}/en`,
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
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8766166885849764"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
