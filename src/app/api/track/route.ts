import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createHash } from 'crypto'

// 동일 IP 30분 내 재방문은 스킵 (DB 부하 최소화)
const cooldownMap = new Map<string, number>()
const COOLDOWN_MS = 30 * 60 * 1000

function hashIp(ip: string): string {
  return createHash('sha256')
    .update(ip + (process.env.IP_SALT ?? 'salt'))
    .digest('hex')
    .slice(0, 16)
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const now = Date.now()
  const lastVisit = cooldownMap.get(ip)

  if (lastVisit && now - lastVisit < COOLDOWN_MS) {
    return Response.json({ ok: false, reason: 'cooldown' })
  }

  cooldownMap.set(ip, now)

  const ipHash = hashIp(ip)
  // Vercel은 x-vercel-ip-country 헤더를 자동으로 붙여줌 (로컬 dev는 null)
  const visitorCountry = req.headers.get('x-vercel-ip-country') ?? 'XX'

  const { error } = await supabase
    .from('site_visits')
    .insert({ ip_hash: ipHash, visitor_country: visitorCountry })

  if (error) return Response.json({ ok: false }, { status: 500 })

  return Response.json({ ok: true })
}
