import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return Response.json({ error: 'Unauthorized: no token' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return Response.json({ error: `Unauthorized: ${authError?.message ?? 'no user'}` }, { status: 401 })
  }
  if (user.email !== process.env.ADMIN_EMAIL?.trim()) {
    return Response.json({ error: `Unauthorized: email mismatch (${user.email})` }, { status: 401 })
  }

  const rangeParam = req.nextUrl.searchParams.get('range') ?? '7d'
  const days = rangeParam === '30d' ? 30 : 7
  const rangeStart = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)

  const [pollRes, quizRes, commentRes, pinRes, totalPollRes, totalQuizRes, totalCommentRes, totalPinRes] =
    await Promise.all([
      supabaseAdmin.from('poll_votes').select('poll_date').gte('poll_date', rangeStart),
      supabaseAdmin.from('quiz_answers').select('session_id, created_at').gte('created_at', rangeStart),
      supabaseAdmin.from('country_comments').select('created_at').gte('created_at', rangeStart).eq('is_hidden', false),
      supabaseAdmin.from('globe_pins').select('created_at').gte('created_at', rangeStart),
      supabaseAdmin.from('poll_votes').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('quiz_sessions').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('country_comments').select('*', { count: 'exact', head: true }).eq('is_hidden', false),
      supabaseAdmin.from('globe_pins').select('*', { count: 'exact', head: true }),
    ])

  const dateMap: Record<string, { votes: number; quizSessions: number; comments: number; pins: number }> = {}

  function ensureDate(d: string) {
    if (!dateMap[d]) dateMap[d] = { votes: 0, quizSessions: 0, comments: 0, pins: 0 }
  }

  for (const row of (pollRes.data ?? [])) {
    const d = row.poll_date as string
    ensureDate(d)
    dateMap[d].votes++
  }

  const quizByDate: Record<string, Set<string>> = {}
  for (const row of (quizRes.data ?? [])) {
    const d = (row.created_at as string).slice(0, 10)
    if (!quizByDate[d]) quizByDate[d] = new Set()
    quizByDate[d].add(row.session_id as string)
  }
  for (const [d, sessions] of Object.entries(quizByDate)) {
    ensureDate(d)
    dateMap[d].quizSessions = sessions.size
  }

  for (const row of (commentRes.data ?? [])) {
    const d = (row.created_at as string).slice(0, 10)
    ensureDate(d)
    dateMap[d].comments++
  }

  for (const row of (pinRes.data ?? [])) {
    const d = (row.created_at as string).slice(0, 10)
    ensureDate(d)
    dateMap[d].pins++
  }

  const daily = Object.entries(dateMap)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, counts]) => ({ date, ...counts }))

  const totals = {
    votes: totalPollRes.count ?? 0,
    quizSessions: totalQuizRes.count ?? 0,
    comments: totalCommentRes.count ?? 0,
    pins: totalPinRes.count ?? 0,
  }

  return Response.json({ daily, totals })
}
