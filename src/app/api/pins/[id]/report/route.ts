import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/pins/[id]/report
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // report_count 증가 후 3 이상이면 숨김
  const { data, error } = await supabase.rpc('increment_pin_report', { pin_id: id })

  if (error) {
    // rpc 없을 경우 fallback: 직접 업데이트
    const { data: pin } = await supabase
      .from('globe_pins')
      .select('report_count')
      .eq('id', id)
      .single()

    if (!pin) return Response.json({ error: 'pin not found' }, { status: 404 })

    const newCount = (pin.report_count ?? 0) + 1
    await supabase
      .from('globe_pins')
      .update({ report_count: newCount, is_approved: newCount < 3 })
      .eq('id', id)

    return Response.json({ reported: true })
  }

  return Response.json({ reported: true, data })
}
