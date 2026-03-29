import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/comments/feed?limit=50
export async function GET(req: NextRequest) {
  const limit = Math.min(100, Number(req.nextUrl.searchParams.get('limit') ?? '50'))

  const { data, error } = await supabase
    .from('country_comments')
    .select('id, country_code, content, created_at')
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ comments: data ?? [] }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
