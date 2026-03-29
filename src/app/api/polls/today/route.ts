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

export async function GET(req: NextRequest) {
  const { idx, question, date } = getTodayQuestion()
  const ip = getIp(req)
  const ipHash = hashIp(ip)

  // 오늘 투표 결과 + 내 투표 여부 병렬 조회
  const [resultsRes, myVoteRes] = await Promise.all([
    supabase.rpc('get_poll_results', { p_date: date }),
    supabase
      .from('poll_votes')
      .select('country_code')
      .eq('poll_date', date)
      .eq('ip_hash', ipHash)
      .maybeSingle(),
  ])

  const results: Record<string, number> = {}
  let totalVotes = 0
  for (const row of (resultsRes.data ?? []) as { country_code: string; vote_count: number }[]) {
    results[row.country_code] = Number(row.vote_count) || 0
    totalVotes += Number(row.vote_count) || 0
  }

  return Response.json({
    date,
    questionIdx: idx,
    question,
    results,
    totalVotes,
    myVote: myVoteRes.data?.country_code ?? null,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
