import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createHash } from 'crypto'

const PAGE_SIZE = 20
const MAX_CONTENT = 50
const RATE_WINDOW_MS = 24 * 60 * 60 * 1000 // 하루

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

// GET /api/comments?country=KR&page=1
export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get('country')
  const page    = Math.max(1, Number(req.nextUrl.searchParams.get('page') ?? '1'))

  if (!country) return Response.json({ error: 'country required' }, { status: 400 })

  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const { data, error, count } = await supabase
    .from('country_comments')
    .select('id, content, created_at, report_count', { count: 'exact' })
    .eq('country_code', country)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({
    comments: data ?? [],
    total: count ?? 0,
    page,
    hasMore: (count ?? 0) > to + 1,
  })
}

// POST /api/comments  { country_code, content }
export async function POST(req: NextRequest) {
  const ip     = getIp(req)
  const ipHash = hashIp(ip)
  const { country_code, content } = await req.json()

  if (!country_code || !content?.trim()) {
    return Response.json({ error: '필수 항목 누락' }, { status: 400 })
  }
  if (content.trim().length > MAX_CONTENT) {
    return Response.json({ error: `최대 ${MAX_CONTENT}자` }, { status: 400 })
  }
  // URL 필터
  if (/https?:\/\/|www\./i.test(content)) {
    return Response.json({ error: 'URL은 포함할 수 없어요' }, { status: 400 })
  }

  // 하루 1개 제한
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString()
  const { count } = await supabase
    .from('country_comments')
    .select('id', { count: 'exact', head: true })
    .eq('country_code', country_code)
    .eq('ip_hash', ipHash)
    .gte('created_at', since)

  if ((count ?? 0) > 0) {
    return Response.json({ error: '같은 나라에 하루 1개만 작성할 수 있어요' }, { status: 429 })
  }

  const { data, error } = await supabase
    .from('country_comments')
    .insert({ country_code, content: content.trim(), ip_hash: ipHash })
    .select('id, content, created_at, report_count')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(data, { status: 201 })
}
