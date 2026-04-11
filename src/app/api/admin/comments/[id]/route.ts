import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return false
  const { data: { user }, error } = await supabase.auth.getUser(token)
  return !error && !!user
}

// DELETE /api/admin/comments/:id  → 영구 숨김
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdmin(req))) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { error } = await supabaseAdmin
    .from('country_comments')
    .update({ is_hidden: true })
    .eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}

// PATCH /api/admin/comments/:id  { action: 'dismiss' } → 신고 초기화
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdmin(req))) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { action } = await req.json()
  if (action !== 'dismiss') return Response.json({ error: 'action must be dismiss' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('country_comments')
    .update({ report_count: 0, reported_by: [], is_hidden: false })
    .eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
