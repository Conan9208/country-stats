import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { session_id, country_code, difficulty, is_correct } = body

    if (!session_id || !country_code || !difficulty || typeof is_correct !== 'boolean') {
      return Response.json({ error: 'invalid params' }, { status: 400 })
    }

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return Response.json({ error: 'invalid difficulty' }, { status: 400 })
    }

    const { error } = await supabase.from('quiz_answers').insert({
      session_id,
      country_code,
      difficulty,
      is_correct,
    })

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: 'internal server error' }, { status: 500 })
  }
}
