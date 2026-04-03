import { NextRequest } from 'next/server'

const WB = 'https://api.worldbank.org/v2'

async function wbFetch(country: string, indicator: string) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(
      `${WB}/country/${country}/indicator/${indicator}?format=json&mrv=5&per_page=5`,
      { next: { revalidate: 86400 }, signal: controller.signal }
    )
    clearTimeout(timeout)
    const json = await res.json()
    const entries: { value: number | null; date: string }[] = json?.[1] ?? []
    for (const e of entries) {
      if (e.value !== null) return { value: e.value, year: e.date }
    }
  } catch { /* ignore */ }
  return null
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const upper = code.toUpperCase()

  const [gdpRes, debtRatioRes, interestRes, exRateRes, countryRes] = await Promise.allSettled([
    wbFetch(upper, 'NY.GDP.MKTP.CD'),       // GDP (USD)
    wbFetch(upper, 'GC.DOD.TOTL.GD.ZS'),    // Debt % of GDP
    wbFetch(upper, 'FR.INR.RINR'),           // Real interest rate
    fetch('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 3600 } }),
    fetch(`https://restcountries.com/v3.1/alpha/${upper}?fields=name,flags,currencies,region`, {
      next: { revalidate: 86400 },
    }),
  ])

  const gdp       = gdpRes.status       === 'fulfilled' ? gdpRes.value       : null
  const debtRatio = debtRatioRes.status === 'fulfilled' ? debtRatioRes.value : null
  const interest  = interestRes.status  === 'fulfilled' ? interestRes.value  : null

  let exchangeRates: Record<string, number> = {}
  if (exRateRes.status === 'fulfilled' && exRateRes.value.ok) {
    const d = await exRateRes.value.json()
    exchangeRates = d.rates ?? {}
  }

  type CurrencyInfo = { code: string; symbol: string; name: string } | null
  let countryName = upper
  let flagUrl     = ''
  let currency: CurrencyInfo = null

  if (countryRes.status === 'fulfilled' && countryRes.value.ok) {
    const raw  = await countryRes.value.json()
    const c    = Array.isArray(raw) ? raw[0] : raw
    const entries = Object.entries(c?.currencies ?? {}) as [string, { symbol?: string; name?: string }][]
    const [cCode, cMeta] = entries[0] ?? []
    countryName = c?.name?.common ?? upper
    flagUrl     = c?.flags?.svg ?? ''
    if (cCode) {
      currency = { code: cCode, symbol: cMeta?.symbol ?? cCode, name: cMeta?.name ?? cCode }
    }
  }

  if (!gdp || !debtRatio) {
    return Response.json(
      { error: '이 나라의 부채 데이터를 찾을 수 없어요', name: countryName, flag: flagUrl },
      { status: 404, headers: { 'Cache-Control': 'public, s-maxage=3600' } }
    )
  }

  const totalDebtUSD  = gdp.value * (debtRatio.value / 100)
  // 실질이자율이 없거나 음수면 4% 적용
  const annualRate    = interest?.value != null && interest.value > 0
    ? interest.value / 100
    : 0.04
  const perSecondUSD  = totalDebtUSD * annualRate / (365 * 24 * 3600)

  let localDebt:      number | null = null
  let perSecondLocal: number | null = null
  let exchangeRate:   number | null = null

  if (currency && currency.code !== 'USD' && exchangeRates[currency.code]) {
    exchangeRate   = exchangeRates[currency.code]
    localDebt      = totalDebtUSD  * exchangeRate
    perSecondLocal = perSecondUSD  * exchangeRate
  }

  return Response.json({
    code: upper,
    name: countryName,
    flag: flagUrl,
    currency,
    gdpUSD:        gdp.value,
    gdpYear:       gdp.year,
    debtRatio:     debtRatio.value,
    debtYear:      debtRatio.year,
    interestRate:  annualRate * 100,
    interestYear:  interest?.year ?? null,
    totalDebtUSD,
    perSecondUSD,
    localDebt,
    perSecondLocal,
    exchangeRate,
  }, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } })
}
