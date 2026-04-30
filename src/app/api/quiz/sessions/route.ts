import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id')
  if (!sessionId) return Response.json({ error: 'session_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('quiz_sessions')
    .select('streak, best_streak, total_correct, total_answered')
    .eq('session_id', sessionId)
    .maybeSingle()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!data) return Response.json(null)
  return Response.json(data)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { session_id, streak, best_streak, total_correct, total_answered } = body

    if (!session_id || typeof session_id !== 'string') {
      return Response.json({ error: 'invalid session_id' }, { status: 400 })
    }

    const { error } = await supabase
      .from('quiz_sessions')
      .upsert(
        {
          session_id,
          streak: streak ?? 0,
          best_streak: best_streak ?? 0,
          total_correct: total_correct ?? 0,
          total_answered: total_answered ?? 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'session_id' }
      )

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: 'internal server error' }, { status: 500 })
  }
}
