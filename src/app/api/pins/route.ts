import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createHash } from 'crypto'

const MAX_MESSAGE = 100
const RATE_WINDOW_MS = 24 * 60 * 60 * 1000

function hashIp(ip: string): string {
  return createHash('sha256').update(ip + (process.env.IP_SALT ?? 'salt')).digest('hex').slice(0, 16)
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

// GET /api/pins?country=KR  또는  GET /api/pins/all (query: all=1)
export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get('country')
  const all = req.nextUrl.searchParams.get('all')

  const now = new Date().toISOString()

  if (all === '1') {
    const { data, error } = await supabase
      .from('globe_pins')
      .select('id, country_alpha2, message, emoji, link_url, tier, created_at, expires_at')
      .eq('is_approved', true)
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data ?? [])
  }

  if (!country) return Response.json({ error: 'country or all=1 required' }, { status: 400 })

  const { data, error } = await supabase
    .from('globe_pins')
    .select('id, country_alpha2, message, emoji, link_url, tier, created_at, expires_at')
    .eq('country_alpha2', country)
    .eq('is_approved', true)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}

// POST /api/pins  { country_alpha2, message, emoji?, link_url? }
export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const ipHash = hashIp(ip)
  const body = await req.json()
  const { country_alpha2, message, emoji, link_url } = body

  if (!country_alpha2 || !message?.trim()) {
    return Response.json({ error: '필수 항목 누락' }, { status: 400 })
  }
  if (message.trim().length > MAX_MESSAGE) {
    return Response.json({ error: `최대 ${MAX_MESSAGE}자` }, { status: 400 })
  }

  // 하루 1개 제한 (전체 기준, 나라 무관)
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString()
  const { count } = await supabase
    .from('globe_pins')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', since)

  if ((count ?? 0) > 0) {
    return Response.json({ error: '하루에 핀 1개만 등록할 수 있어요' }, { status: 429 })
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('globe_pins')
    .insert({
      country_alpha2,
      message: message.trim(),
      emoji: emoji ?? '📍',
      link_url: link_url?.trim() || null,
      ip_hash: ipHash,
      expires_at: expiresAt,
    })
    .select('id, country_alpha2, message, emoji, link_url, tier, created_at, expires_at')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
