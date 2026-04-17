import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ from?: string; to?: string }>
}

// 구 URL (?from=KR&to=US) 및 /travel 직접 접근을 새 경로로 redirect
export default async function TravelIndexPage({ params, searchParams }: Props) {
  const { locale }   = await params
  const sp           = await searchParams
  const from = (sp.from ?? 'KR').toUpperCase()
  const to   = (sp.to   ?? (from === 'US' ? 'JP' : 'US')).toUpperCase()
  redirect(`/${locale}/travel/${from}/${to}`)
}
