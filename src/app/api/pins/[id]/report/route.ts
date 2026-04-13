import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createHash } from 'crypto'

// 중복 신고 방지: "pinId:ipHash" → 신고 시각 (24h TTL)
const reportedMap = new Map<string, number>()
const REPORT_TTL = 24 * 60 * 60 * 1000

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

// POST /api/pins/[id]/report
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ip = getIp(req)
  const ipHash = hashIp(ip)
  const reportKey = `${id}:${ipHash}`
  const now = Date.now()

  // 만료된 항목 정리 (메모리 누수 방지)
  for (const [k, t] of reportedMap) {
    if (now - t > REPORT_TTL) reportedMap.delete(k)
  }

  // 중복 신고 체크
  const lastReport = reportedMap.get(reportKey)
  if (lastReport && now - lastReport < REPORT_TTL) {
    return Response.json({ error: '이미 신고한 핀이에요' }, { status: 409 })
  }

  // report_count 증가 후 3 이상이면 숨김
  const { data, error } = await supabaseAdmin.rpc('increment_pin_report', { pin_id: id })

  if (error) {
    // rpc 없을 경우 fallback: 직접 업데이트
    const { data: pin } = await supabaseAdmin
      .from('globe_pins')
      .select('report_count')
      .eq('id', id)
      .single()

    if (!pin) return Response.json({ error: 'pin not found' }, { status: 404 })

    const newCount = (pin.report_count ?? 0) + 1
    await supabaseAdmin
      .from('globe_pins')
      .update({ report_count: newCount, is_approved: newCount < 20 })
      .eq('id', id)

    reportedMap.set(reportKey, now)
    return Response.json({ reported: true })
  }

  reportedMap.set(reportKey, now)
  return Response.json({ reported: true, data })
}
