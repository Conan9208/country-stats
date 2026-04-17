import type { CountryBasic, Region } from '@/types/travel'

// ─── REST Countries 응답 → CountryBasic 변환 ─────────────────────────────────

export function parseCountry(raw: Record<string, unknown>): CountryBasic {
  const currencies = raw.currencies as Record<string, { name: string; symbol: string }> | undefined
  const firstCurrencyCode = currencies ? Object.keys(currencies)[0] : 'USD'
  const firstCurrency = currencies?.[firstCurrencyCode] ?? { name: '', symbol: '' }
  const languages = raw.languages as Record<string, string> | undefined

  return {
    cca2: raw.cca2 as string,
    name: (raw.name as { common: string }).common,
    flag: (raw.flags as { svg: string }).svg,
    capital: ((raw.capital as string[]) ?? [])[0] ?? '-',
    population: raw.population as number,
    area: raw.area as number,
    region: raw.region as string,
    languages: Object.values(languages ?? {}).slice(0, 2),
    currency: { code: firstCurrencyCode, name: firstCurrency.name, symbol: firstCurrency.symbol },
    timezones: (raw.timezones as string[]) ?? [],
    drivingSide: ((raw.car as { side: string })?.side as 'left' | 'right') ?? 'right',
  }
}

// ─── 시차 계산 ──────────────────────────────────────────────────────────────

export function getUtcOffsetHours(timezone: string): number {
  try {
    const fmt = new Intl.DateTimeFormat('en', { timeZone: timezone, timeZoneName: 'shortOffset' })
    const parts = fmt.formatToParts(Date.now())
    const offsetStr = parts.find(p => p.type === 'timeZoneName')?.value ?? 'GMT+0'
    const match = offsetStr.match(/GMT([+-]\d+(?::\d+)?)/)
    if (!match) return 0
    const [h, m = '0'] = match[1].replace('+', '').split(':')
    const sign = match[1].startsWith('-') ? -1 : 1
    return sign * (Math.abs(Number(h)) + Number(m) / 60)
  } catch {
    return 0
  }
}

export function parseUtcOffset(utcStr: string): number {
  const match = utcStr.match(/UTC([+-])(\d{1,2})(?::(\d{2}))?/)
  if (!match) return 0
  const sign = match[1] === '+' ? 1 : -1
  return sign * (Number(match[2]) + (Number(match[3] ?? 0)) / 60)
}

export function getTimezoneFromCountry(country: CountryBasic, region?: Region): string {
  if (region) return region.timezone
  return country.timezones[0] ?? 'UTC'
}

export function calcTimeDiff(fromCountry: CountryBasic, toCountry: CountryBasic, toRegion?: Region): number {
  const fromTz = getTimezoneFromCountry(fromCountry)
  const toTz   = getTimezoneFromCountry(toCountry, toRegion)
  const isIana = (tz: string) => !tz.startsWith('UTC')
  const fromOffset = isIana(fromTz) ? getUtcOffsetHours(fromTz) : parseUtcOffset(fromTz)
  const toOffset   = isIana(toTz)   ? getUtcOffsetHours(toTz)   : parseUtcOffset(toTz)
  return toOffset - fromOffset
}

export function formatTimeDiff(diff: number): string {
  const abs   = Math.abs(diff)
  const hours = Math.floor(abs)
  const mins  = Math.round((abs - hours) * 60)
  const sign  = diff > 0 ? '+' : diff < 0 ? '-' : ''
  if (mins === 0) return diff === 0 ? '동일 시간대' : `${sign}${hours}시간`
  return `${sign}${hours}시간 ${mins}분`
}

// UTC+09:00 형식 포함하여 현재 시각 반환
export function getCurrentTimeStr(timezone: string): string {
  try {
    if (timezone.startsWith('UTC')) {
      if (timezone === 'UTC') {
        const d = new Date()
        return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
      }
      const match = timezone.match(/UTC([+-])(\d{1,2})(?::(\d{2}))?/)
      if (!match) return ''
      const sign = match[1] === '+' ? 1 : -1
      const totalMins = sign * (Number(match[2]) * 60 + Number(match[3] ?? 0))
      const localMs = Date.now() + totalMins * 60000
      const d = new Date(localMs)
      return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
    }
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date())
  } catch {
    return ''
  }
}

// ─── 숫자 포맷 ──────────────────────────────────────────────────────────────

export function fmtRate(rate: number): string {
  if (rate >= 1000) return rate.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
  if (rate >= 100)  return rate.toFixed(1)
  if (rate >= 1)    return rate.toFixed(2)
  if (rate >= 0.01) return rate.toFixed(4)
  return rate.toFixed(6)
}

export function fmtPop(n: number): string {
  if (n >= 1e8) return (n / 1e8).toFixed(1) + '억'
  if (n >= 1e4) return Math.round(n / 1e4).toLocaleString() + '만'
  return n.toLocaleString()
}

export function fmtArea(n: number): string {
  return n.toLocaleString() + ' km²'
}
