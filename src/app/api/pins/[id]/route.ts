import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'

const SELECT_FIELDS = 'id, country_alpha2, kind, business_name, description, logo_url, website_url, emoji, message, tier, created_at, expires_at'

// GET /api/pins/[id] — 단일 핀 조회 (딥링크 착륙 · OG 이미지용)
// 만료 여부는 필터하지 않음: 공유 링크가 만료 후에 열려도 내용은 보여주기 위함.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // uuid 형태만 허용
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return Response.json({ error: 'invalid id' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('globe_pins')
    .select(SELECT_FIELDS)
    .eq('id', id)
    .eq('is_approved', true)
    .single()

  if (error || !data) {
    return Response.json({ error: 'not found' }, { status: 404 })
  }

  return Response.json(data, {
    headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
  })
}
