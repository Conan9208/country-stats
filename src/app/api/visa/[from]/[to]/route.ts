import { NextRequest } from 'next/server'
import { getVisaRequirement } from '@/lib/visaCheck'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ from: string; to: string }> }
) {
  const { from, to } = await params
  try {
    const result = await getVisaRequirement(from, to)
    return Response.json(result, {
      headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=3600' },
    })
  } catch {
    return Response.json(
      { type: 'unknown', label_ko: '조회 실패', color: '#64748b' },
      { status: 200 }
    )
  }
}
