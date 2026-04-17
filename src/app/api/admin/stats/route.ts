import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  // Bearer 토큰으로 관리자 인증 검증
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return Response.json({ error: 'Unauthorized: no token' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return Response.json({ error: `Unauthorized: ${authError?.message ?? 'no user'}` }, { status: 401 })
  }
  if (user.email !== process.env.ADMIN_EMAIL?.trim()) {
    return Response.json({ error: `Unauthorized: email mismatch (${user.email})` }, { status: 401 })
  }

  const rangeParam = req.nextUrl.searchParams.get('range') ?? '7d'
  const days = rangeParam === '30d' ? 30 : 7
  const todayStart = new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z'
  const rangeStart = new Date(Date.now() - days * 86400000).toISOString()

  // service role로 RLS 우회하여 조회
  const [allRes, todayRes, rangeRes] = await Promise.all([
    supabaseAdmin
      .from('site_visits')
      .select('ip_hash, visitor_country'),
    supabaseAdmin
      .from('site_visits')
      .select('ip_hash')
      .gte('visited_at', todayStart),
    supabaseAdmin
      .from('site_visits')
      .select('ip_hash, visitor_country, visited_at')
      .gte('visited_at', rangeStart),
  ])

  if (allRes.error) return Response.json({ error: allRes.error.message }, { status: 500 })
  if (rangeRes.error) return Response.json({ error: rangeRes.error.message }, { status: 500 })

  const allData = allRes.data ?? []
  const todayData = todayRes.data ?? []
  const rangeData = rangeRes.data ?? []

  // 유니크 방문자 (ip_hash 기준)
  const totalVisitors = new Set(allData.map(r => r.ip_hash)).size
  const todayVisitors = new Set(todayData.map(r => r.ip_hash)).size

  // 방문자 출신 국가 집계 TOP 10 (유니크 ip_hash 기준)
  const countryIps: Record<string, Set<string>> = {}
  for (const row of allData) {
    const c = row.visitor_country ?? 'XX'
    if (!countryIps[c]) countryIps[c] = new Set()
    countryIps[c].add(row.ip_hash)
  }
  const countryCount = Object.fromEntries(
    Object.entries(countryIps).map(([c, ips]) => [c, ips.size])
  )
  const topCountries = Object.entries(countryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([country, count]) => ({ country, count }))

  // 일별 국가 통계 (유니크 ip_hash 기준)
  const byDate: Record<string, { ips: Set<string>; countryIps: Record<string, Set<string>> }> = {}
  for (const row of rangeData) {
    const date = (row.visited_at as string).slice(0, 10)
    if (!byDate[date]) byDate[date] = { ips: new Set(), countryIps: {} }
    byDate[date].ips.add(row.ip_hash)
    const c = row.visitor_country ?? 'XX'
    if (!byDate[date].countryIps[c]) byDate[date].countryIps[c] = new Set()
    byDate[date].countryIps[c].add(row.ip_hash)
  }

  const dailyStats = Object.entries(byDate)
    .sort((a, b) => b[0].localeCompare(a[0]))  // 날짜 내림차순
    .map(([date, { ips, countryIps: cIps }]) => ({
      date,
      visitors: ips.size,
      countries: Object.entries(cIps)
        .map(([country, ipSet]) => ({ country, count: ipSet.size }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    }))

  return Response.json({ todayVisitors, totalVisitors, topCountries, dailyStats })
}
