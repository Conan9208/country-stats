import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'

const IS_PUBLIC = process.env.STATS_PUBLIC === 'true'

export async function GET(req: NextRequest) {
  // 비공개 모드일 때만 인증 검증
  if (!IS_PUBLIC) {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const todayStart = new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z'

  const [allRes, todayRes] = await Promise.all([
    supabaseAdmin.from('site_visits').select('ip_hash, visitor_country'),
    supabaseAdmin.from('site_visits').select('ip_hash').gte('visited_at', todayStart),
  ])

  if (allRes.error) return Response.json({ error: allRes.error.message }, { status: 500 })

  const allData = allRes.data ?? []
  const todayData = todayRes.data ?? []

  const totalVisitors = new Set(allData.map(r => r.ip_hash)).size
  const todayVisitors = new Set(todayData.map(r => r.ip_hash)).size

  // 나라별 집계 (전체 방문 횟수 기준)
  const countryCount: Record<string, number> = {}
  for (const row of allData) {
    const c = row.visitor_country ?? 'XX'
    countryCount[c] = (countryCount[c] ?? 0) + 1
  }

  // 정렬: 내림차순, 'XX'는 맨 아래
  const countries = Object.entries(countryCount)
    .sort(([cA, nA], [cB, nB]) => {
      if (cA === 'XX') return 1
      if (cB === 'XX') return -1
      return nB - nA
    })
    .map(([country, count]) => ({ country, count }))

  return Response.json(
    { todayVisitors, totalVisitors, isPublic: IS_PUBLIC, countries },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } }
  )
}
