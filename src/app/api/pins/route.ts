import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createHash } from 'crypto'

const MAX_BUSINESS_NAME = 60
const MAX_DESCRIPTION = 100
const RATE_WINDOW_MS = 24 * 60 * 60 * 1000
const MAX_PINS_PER_DAY = 3
const DISABLE_RATE_LIMIT = process.env.DISABLE_PIN_RATE_LIMIT === 'true'

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

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const SELECT_FIELDS = 'id, country_alpha2, business_name, description, logo_url, website_url, tier, created_at, expires_at'

// GET /api/pins?country=KR  또는  GET /api/pins?all=1
export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get('country')
  const all = req.nextUrl.searchParams.get('all')

  const now = new Date().toISOString()

  if (all === '1') {
    const { data, error } = await supabase
      .from('globe_pins')
      .select(SELECT_FIELDS)
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
    .select(SELECT_FIELDS)
    .eq('country_alpha2', country)
    .eq('is_approved', true)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}

// POST /api/pins  { country_alpha2, business_name, description?, logo_url?, website_url? }
export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const ipHash = hashIp(ip)
  const body = await req.json()
  const { country_alpha2, business_name, description, logo_url, website_url } = body

  if (!country_alpha2 || !business_name?.trim()) {
    return Response.json({ error: '필수 항목 누락 (country_alpha2, business_name)' }, { status: 400 })
  }
  if (business_name.trim().length > MAX_BUSINESS_NAME) {
    return Response.json({ error: `사업명은 최대 ${MAX_BUSINESS_NAME}자` }, { status: 400 })
  }
  if (description && description.trim().length > MAX_DESCRIPTION) {
    return Response.json({ error: `소개는 최대 ${MAX_DESCRIPTION}자` }, { status: 400 })
  }
  if (website_url && !isValidUrl(website_url)) {
    return Response.json({ error: 'URL 형식이 올바르지 않아요 (http:// 또는 https://)' }, { status: 400 })
  }

  // 하루 MAX_PINS_PER_DAY개 제한
  if (!DISABLE_RATE_LIMIT) {
    const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString()
    const { count } = await supabase
      .from('globe_pins')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', since)

    if ((count ?? 0) >= MAX_PINS_PER_DAY) {
      return Response.json({ error: `하루에 핀 ${MAX_PINS_PER_DAY}개만 등록할 수 있어요` }, { status: 429 })
    }
  }

  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('globe_pins')
    .insert({
      country_alpha2,
      business_name: business_name.trim(),
      description: description?.trim() || null,
      logo_url: logo_url || null,
      website_url: website_url?.trim() || null,
      ip_hash: ipHash,
      expires_at: expiresAt,
    })
    .select(SELECT_FIELDS)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
