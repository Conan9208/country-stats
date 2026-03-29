import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  // Bearer 토큰으로 관리자 인증 검증
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const todayStart = new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z'

  // service role로 RLS 우회하여 조회
  const [allRes, todayRes] = await Promise.all([
    supabaseAdmin
      .from('site_visits')
      .select('ip_hash, visitor_country'),
    supabaseAdmin
      .from('site_visits')
      .select('ip_hash')
      .gte('visited_at', todayStart),
  ])

  if (allRes.error) return Response.json({ error: allRes.error.message }, { status: 500 })

  const allData = allRes.data ?? []
  const todayData = todayRes.data ?? []

  // 유니크 방문자 (ip_hash 기준)
  const totalVisitors = new Set(allData.map(r => r.ip_hash)).size
  const todayVisitors = new Set(todayData.map(r => r.ip_hash)).size

  // 방문자 출신 국가 집계 TOP 10
  const countryCount: Record<string, number> = {}
  for (const row of allData) {
    const c = row.visitor_country ?? 'XX'
    countryCount[c] = (countryCount[c] ?? 0) + 1
  }
  const topCountries = Object.entries(countryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([country, count]) => ({ country, count }))

  return Response.json({ todayVisitors, totalVisitors, topCountries })
}
