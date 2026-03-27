import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createHash } from 'crypto'

const REPORT_THRESHOLD = 3  // 이 수 이상이면 자동 숨김

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

// POST /api/comments/report  { comment_id }
export async function POST(req: NextRequest) {
  const ip     = getIp(req)
  const ipHash = hashIp(ip)
  const { comment_id } = await req.json()

  if (!comment_id) return Response.json({ error: 'comment_id required' }, { status: 400 })

  // 같은 IP가 같은 댓글 중복 신고 방지 (reports 컬럼에 ip_hash 목록 저장)
  const { data: comment, error: fetchErr } = await supabase
    .from('country_comments')
    .select('id, report_count, reported_by')
    .eq('id', comment_id)
    .single()

  if (fetchErr || !comment) return Response.json({ error: '댓글 없음' }, { status: 404 })

  const reportedBy: string[] = comment.reported_by ?? []
  if (reportedBy.includes(ipHash)) {
    return Response.json({ error: '이미 신고한 댓글이에요' }, { status: 409 })
  }

  const newCount   = (comment.report_count ?? 0) + 1
  const shouldHide = newCount >= REPORT_THRESHOLD

  const { error: updateErr } = await supabase
    .from('country_comments')
    .update({
      report_count: newCount,
      reported_by:  [...reportedBy, ipHash],
      is_hidden:    shouldHide,
    })
    .eq('id', comment_id)

  if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 })

  return Response.json({ report_count: newCount, hidden: shouldHide })
}
