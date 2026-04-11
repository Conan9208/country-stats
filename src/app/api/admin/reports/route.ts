import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return false
  const { data: { user }, error } = await supabase.auth.getUser(token)
  return !error && !!user
}

// GET /api/admin/reports?type=comments|pins&page=1
export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'comments'
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const PAGE_SIZE = 30
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  if (type === 'comments') {
    const { data, error, count } = await supabaseAdmin
      .from('country_comments')
      .select('id, country_code, content, report_count, is_hidden, created_at', { count: 'exact' })
      .gt('report_count', 0)
      .order('report_count', { ascending: false })
      .range(from, to)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ data, total: count ?? 0, page, pageSize: PAGE_SIZE })
  }

  if (type === 'pins') {
    const { data, error, count } = await supabaseAdmin
      .from('globe_pins')
      .select('id, country_alpha2, business_name, description, website_url, report_count, is_approved, expires_at, created_at', { count: 'exact' })
      .gt('report_count', 0)
      .order('report_count', { ascending: false })
      .range(from, to)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ data, total: count ?? 0, page, pageSize: PAGE_SIZE })
  }

  return Response.json({ error: 'type must be comments or pins' }, { status: 400 })
}
