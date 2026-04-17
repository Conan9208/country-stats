import { NextRequest } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ city: string }> }
) {
  const { city } = await params
  const cityEncoded = encodeURIComponent(city)

  try {
    const res = await fetch(`https://wttr.in/${cityEncoded}?format=j1`, {
      headers: { 'User-Agent': 'WorldStats/1.0' },
      next: { revalidate: 1800 }, // 30분 캐시
    })

    if (!res.ok) {
      return Response.json({ error: `wttr.in error: ${res.status}` }, { status: 502 })
    }

    const data = await res.json()
    const current = data?.current_condition?.[0]

    if (!current) {
      return Response.json({ error: 'No weather data' }, { status: 502 })
    }

    return Response.json(
      {
        temp_c: Number(current.temp_C),
        feels_like_c: Number(current.FeelsLikeC),
        description: current.weatherDesc?.[0]?.value ?? '',
        icon_url: current.weatherIconUrl?.[0]?.value ?? '',
      },
      { headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=300' } }
    )
  } catch {
    return Response.json({ error: 'Failed to fetch weather' }, { status: 502 })
  }
}
