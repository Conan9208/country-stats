import { NextRequest, NextResponse } from 'next/server'
import { getAllRestCountries, getRestCountry } from '@/lib/countryData'

// 번들 국가 데이터를 restcountries v3.1 호환 형태로 제공.
// restcountries.com 다운 대응 — 클라이언트는 URL 만 이 엔드포인트로 바꾸면 된다.
//   GET /api/countries          → 전체 국가 배열
//   GET /api/countries?code=KR  → 단일 국가 객체

export const revalidate = 86400

export function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')

  if (code) {
    const country = getRestCountry(code)
    if (!country) {
      return NextResponse.json({ error: 'Country not found' }, { status: 404 })
    }
    return NextResponse.json(country, {
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' },
    })
  }

  return NextResponse.json(getAllRestCountries(), {
    headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' },
  })
}
