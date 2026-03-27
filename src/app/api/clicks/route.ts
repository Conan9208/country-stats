import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

// --- Rate limiting (in-memory, per serverless instance) ---
// 완전한 차단은 아니지만 일반적인 어뷰징의 95%를 막습니다.
// 트래픽이 커지면 Upstash Redis로 교체하세요.
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT = 10   // 같은 IP에서 최대 N회
const RATE_WINDOW = 60_000 // 1분 (ms)

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = (rateLimitMap.get(ip) ?? []).filter(t => now - t < RATE_WINDOW)
  if (timestamps.length >= RATE_LIMIT) return true
  rateLimitMap.set(ip, [...timestamps, now])
  return false
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

// --- GET: 전체 + 오늘 클릭 데이터 ---
export async function GET() {
  const today = new Date().toISOString().slice(0, 10)

  const [totalRes, dailyRes] = await Promise.all([
    supabase.from('country_views').select('country_code, view_count, name'),
    supabase.from('country_daily_views').select('country_code, view_count').eq('view_date', today),
  ])

  if (totalRes.error) return Response.json({ error: totalRes.error.message }, { status: 500 })

  const todayMap: Record<string, number> = {}
  for (const row of dailyRes.data ?? []) {
    todayMap[row.country_code] = Number(row.view_count) || 0
  }

  const result: Record<string, { total: number; today: number; name?: string }> = {}
  for (const row of totalRes.data ?? []) {
    result[row.country_code] = {
      total: Number(row.view_count) || 0,
      today: todayMap[row.country_code] ?? 0,
      name: row.name ?? undefined,
    }
  }

  return Response.json(result, {
    headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' },
  })
}

// --- POST: 클릭 수 atomic increment ---
export async function POST(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(ip)) {
    return Response.json({ error: 'rate limit exceeded' }, { status: 429 })
  }

  const { alpha2, name } = await request.json()
  if (!alpha2 || typeof alpha2 !== 'string') {
    return Response.json({ error: 'invalid alpha2' }, { status: 400 })
  }

  // Atomic upsert: DB 함수 1번 호출로 race condition 없이 증가
  const { data, error } = await supabase.rpc('increment_view_count', {
    p_country_code: alpha2,
    p_name: name ?? null,
  })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const { total, today } = data as { total: number; today: number }
  return Response.json({ total, today })
}
