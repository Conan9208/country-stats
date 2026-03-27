import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('country_views')
    .select('country_code, view_count')

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const result: Record<string, { total: number }> = {}
  for (const row of data ?? []) {
    result[row.country_code] = { total: row.view_count }
  }

  return Response.json(result)
}

export async function POST(request: NextRequest) {
  const { alpha2 } = await request.json()
  if (!alpha2 || typeof alpha2 !== 'string') {
    return Response.json({ error: 'invalid alpha2' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('country_views')
    .select('view_count')
    .eq('country_code', alpha2)
    .single()

  if (existing) {
    const { data, error } = await supabase
      .from('country_views')
      .update({
        view_count: existing.view_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('country_code', alpha2)
      .select('country_code, view_count')
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ total: data.view_count })
  } else {
    const { data, error } = await supabase
      .from('country_views')
      .insert({ country_code: alpha2, view_count: 1 })
      .select('country_code, view_count')
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ total: data.view_count })
  }
}
