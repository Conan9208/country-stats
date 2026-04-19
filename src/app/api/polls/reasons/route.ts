import { supabaseAdmin } from '@/lib/supabase-admin'
import { getTodayQuestion } from '@/lib/pollQuestions'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 100)
  const { date } = getTodayQuestion()

  const { data, error } = await supabaseAdmin
    .from('poll_votes')
    .select('country_code, reason, created_at')
    .eq('poll_date', date)
    .not('reason', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return Response.json({ reasons: [] }, { status: 500 })
  return Response.json({ reasons: data ?? [] })
}
