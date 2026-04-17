import { NextRequest } from 'next/server'

// ─── 비자 요건 타입 ─────────────────────────────────────────────────────────

export interface VisaRequirement {
  type: 'visa-free' | 'voa' | 'evisa' | 'required' | 'no-admission' | 'unknown'
  label_ko: string
  days?: number      // visa-free days (있는 경우)
  color: string
  note?: string
}

function mapRequirement(raw: string): VisaRequirement {
  const v = raw.trim().toLowerCase()

  // 숫자: 무비자 허용 기간
  const days = Number(v)
  if (!isNaN(days) && days > 0) {
    const d = days >= 999 ? undefined : days
    return {
      type: 'visa-free',
      label_ko: d ? `무비자 (최대 ${d}일)` : '무비자 (제한 없음)',
      days: d,
      color: '#86efac',
    }
  }

  if (v === 'vf' || v === 'visa free' || v === 'visa-free') {
    return { type: 'visa-free', label_ko: '무비자', color: '#86efac' }
  }
  if (v === 'voa' || v.includes('on arrival')) {
    return { type: 'voa', label_ko: '도착 비자 (VOA)', color: '#fbbf24' }
  }
  if (v === 'eta' || v === 'evisa' || v === 'e-visa' || v.includes('e-visa') || v.includes('evisa') || v.includes('eta')) {
    return { type: 'evisa', label_ko: '전자비자 / ETA', color: '#a78bfa' }
  }
  if (v === 'vr' || v.includes('required')) {
    return { type: 'required', label_ko: '비자 필요', color: '#f87171' }
  }
  if (v === 'na' || v === 'cb' || v.includes('no admission') || v.includes('closed')) {
    return { type: 'no-admission', label_ko: '입국 불가', color: '#ef4444' }
  }

  return { type: 'unknown', label_ko: raw, color: '#64748b' }
}

// ─── 모듈 캐시 (Vercel serverless 인스턴스 단위 유지) ─────────────────────

let csvCache: string | null = null
let cacheAt = 0
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24h

async function getVisaCSV(): Promise<string> {
  if (csvCache && Date.now() - cacheAt < CACHE_TTL) return csvCache
  const res = await fetch(
    'https://raw.githubusercontent.com/ilyankou/passport-index-dataset/master/passport-index-tidy.csv',
    { next: { revalidate: 86400 } }
  )
  if (!res.ok) throw new Error('passport-index fetch failed')
  csvCache = await res.text()
  cacheAt = Date.now()
  return csvCache
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ from: string; to: string }> }
) {
  const { from, to } = await params
  const fromCode = from.toUpperCase()
  const toCode   = to.toUpperCase()

  // 자국 여행
  if (fromCode === toCode) {
    return Response.json({ type: 'visa-free', label_ko: '자국', color: '#86efac' })
  }

  try {
    const csv = await getVisaCSV()
    const lines = csv.split('\n')

    for (const line of lines) {
      const parts = line.split(',')
      if (parts.length < 3) continue
      const passport    = parts[0].trim().toUpperCase()
      const destination = parts[1].trim().toUpperCase()
      if (passport === fromCode && destination === toCode) {
        const raw = parts.slice(2).join(',').trim().replace(/^"|"$/g, '')
        return Response.json(
          mapRequirement(raw),
          { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=3600' } }
        )
      }
    }

    return Response.json(
      { type: 'unknown', label_ko: '데이터 없음', color: '#64748b' },
      { headers: { 'Cache-Control': 's-maxage=86400' } }
    )
  } catch {
    return Response.json({ type: 'unknown', label_ko: '조회 실패', color: '#64748b' }, { status: 200 })
  }
}
