import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getTodayQuestion } from '@/lib/pollQuestions'
import { createHash } from 'crypto'

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

function hashIp(ip: string): string {
  return createHash('sha256').update(ip + 'poll_salt_2026').digest('hex').slice(0, 32)
}

// 투표 이유 저장 (선택)
export async function PATCH(req: NextRequest) {
  const ip = getIp(req)
  const ipHash = hashIp(ip)
  const { date } = getTodayQuestion()
  const { reason } = await req.json() as { reason?: string }

  const { error } = await supabase
    .from('poll_votes')
    .update({ reason: reason?.slice(0, 200) ?? null })
    .eq('poll_date', date)
    .eq('ip_hash', ipHash)

  if (error) return Response.json({ ok: false }, { status: 500 })
  return Response.json({ ok: true })
}

// 투표 취소 — 오늘 내 투표를 DB에서 삭제
export async function DELETE(req: NextRequest) {
  const ip = getIp(req)
  const ipHash = hashIp(ip)
  const { date } = getTodayQuestion()

  const { error } = await supabase
    .from('poll_votes')
    .delete()
    .eq('poll_date', date)
    .eq('ip_hash', ipHash)

  if (error) return Response.json({ ok: false, reason: 'db_error' }, { status: 500 })
  return Response.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const { alpha2 } = await req.json() as { alpha2: string }
  if (!alpha2 || typeof alpha2 !== 'string' || alpha2.length !== 2) {
    return Response.json({ ok: false, reason: 'invalid_country' }, { status: 400 })
  }

  const ip = getIp(req)
  const ipHash = hashIp(ip)
  const { idx, date } = getTodayQuestion()

  const { data, error } = await supabase.rpc('cast_poll_vote', {
    p_date: date,
    p_question_idx: idx,
    p_country_code: alpha2,
    p_ip_hash: ipHash,
  })

  if (error) {
    return Response.json({ ok: false, reason: 'db_error' }, { status: 500 })
  }

  const result = data as { ok: boolean; reason?: string }
  return Response.json(result, { status: result.ok ? 200 : 409 })
}
