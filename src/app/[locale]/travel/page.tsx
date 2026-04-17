'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, ArrowLeftRight, RefreshCw } from 'lucide-react'
import { COUNTRY_REGIONS } from '@/data/countryRegions'
import { getWeatherLabel } from '@/lib/weatherCodes'
import { getElectrical, getAdapterStatus, PLUG_TYPE_LABELS } from '@/data/electricalStandards'
import type { CountryBasic, WeatherInfo, Region, VisaRequirement } from '@/types/travel'

// ─── REST Countries 응답 → CountryBasic 변환 ────────────────────────────────

function parseCountry(raw: Record<string, unknown>): CountryBasic {
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

function getUtcOffsetHours(timezone: string): number {
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

function parseUtcOffset(utcStr: string): number {
  const match = utcStr.match(/UTC([+-])(\d{1,2})(?::(\d{2}))?/)
  if (!match) return 0
  const sign = match[1] === '+' ? 1 : -1
  return sign * (Number(match[2]) + (Number(match[3] ?? 0)) / 60)
}

function getTimezoneFromCountry(country: CountryBasic, region?: Region): string {
  if (region) return region.timezone
  return country.timezones[0] ?? 'UTC'
}

function calcTimeDiff(fromCountry: CountryBasic, toCountry: CountryBasic, toRegion?: Region): number {
  const fromTz = getTimezoneFromCountry(fromCountry)
  const toTz = getTimezoneFromCountry(toCountry, toRegion)
  const isIana = (tz: string) => !tz.startsWith('UTC')
  const fromOffset = isIana(fromTz) ? getUtcOffsetHours(fromTz) : parseUtcOffset(fromTz)
  const toOffset = isIana(toTz) ? getUtcOffsetHours(toTz) : parseUtcOffset(toTz)
  return toOffset - fromOffset
}

function formatTimeDiff(diff: number): string {
  const abs = Math.abs(diff)
  const hours = Math.floor(abs)
  const mins = Math.round((abs - hours) * 60)
  const sign = diff > 0 ? '+' : diff < 0 ? '-' : ''
  if (mins === 0) return diff === 0 ? '동일 시간대' : `${sign}${hours}시간`
  return `${sign}${hours}시간 ${mins}분`
}

// UTC+09:00 형식 포함하여 현재 시각 반환
function getCurrentTimeStr(timezone: string): string {
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

// ─── 날씨 표시 ──────────────────────────────────────────────────────────────

function WeatherCell({ w }: { w: WeatherInfo | null }) {
  if (!w) return <span style={{ color: '#475569', fontSize: 12 }}>정보 없음</span>
  const label = getWeatherLabel(w.weather_code)
  return (
    <span>
      {label.emoji} {w.temp_c}°C
      <span style={{ color: '#64748b', fontSize: 12, marginLeft: 5 }}>{label.ko}</span>
    </span>
  )
}

// ─── 전기 표준 셀 ───────────────────────────────────────────────────────────

import type { ElectricalStandard } from '@/data/electricalStandards'

function ElectricalCell({ elec }: { elec: ElectricalStandard | null }) {
  if (!elec) return <span style={{ color: '#475569', fontSize: 12 }}>정보 없음</span>
  const plugDesc = elec.plug_types
    .map(p => PLUG_TYPE_LABELS[p]?.split(' ')[0] ?? `${p}형`)
    .join(' · ')
  return (
    <span>
      <span style={{ fontWeight: 600 }}>{elec.voltage}V</span>
      <span style={{ color: '#475569', margin: '0 4px' }}>·</span>
      <span>{elec.frequency}Hz</span>
      <span style={{ display: 'block', fontSize: 11, color: '#64748b', marginTop: 2 }}>
        {plugDesc}
      </span>
      {elec.note && (
        <span style={{ display: 'block', fontSize: 10, color: '#fbbf24', marginTop: 2, lineHeight: 1.4 }}>
          ⚠ {elec.note}
        </span>
      )}
    </span>
  )
}

// ─── 환율 포맷 ──────────────────────────────────────────────────────────────

function fmtRate(rate: number): string {
  if (rate >= 1000) return rate.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
  if (rate >= 100)  return rate.toFixed(1)
  if (rate >= 1)    return rate.toFixed(2)
  if (rate >= 0.01) return rate.toFixed(4)
  return rate.toFixed(6)
}

// ─── 숫자 포맷 ──────────────────────────────────────────────────────────────

function fmtPop(n: number): string {
  if (n >= 1e8) return (n / 1e8).toFixed(1) + '억'
  if (n >= 1e4) return Math.round(n / 1e4).toLocaleString() + '만'
  return n.toLocaleString()
}

function fmtArea(n: number): string {
  return n.toLocaleString() + ' km²'
}

// ─── 스타일 ─────────────────────────────────────────────────────────────────

const glass: React.CSSProperties = {
  background: 'rgba(9,9,11,0.82)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
}

// colorScheme: 'dark' 로 드롭다운 목록을 다크 테마로 강제
const selectStyle: React.CSSProperties = {
  background: '#18181b',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  color: '#f1f5f9',
  fontSize: 13,
  padding: '7px 10px',
  cursor: 'pointer',
  outline: 'none',
  colorScheme: 'dark',
}

// ─── 국가 목록 (드롭다운용) ─────────────────────────────────────────────────

interface CountryOption { cca2: string; name: string }

// ─── 메인 컴포넌트 ───────────────────────────────────────────────────────────

function TravelPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const initialFrom = searchParams.get('from') ?? 'KR'
  const initialTo   = searchParams.get('to')   ?? 'US'
  const initialToRegion = searchParams.get('toRegion') ?? ''

  const [fromCode,   setFromCode]   = useState(initialFrom)
  const [toCode,     setToCode]     = useState(initialTo)
  const [toRegionId, setToRegionId] = useState(initialToRegion)

  const [fromData,     setFromData]     = useState<CountryBasic | null>(null)
  const [toData,       setToData]       = useState<CountryBasic | null>(null)
  const [fromWeather,  setFromWeather]  = useState<WeatherInfo | null>(null)
  const [toWeather,    setToWeather]    = useState<WeatherInfo | null>(null)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [rateSwapped,  setRateSwapped]  = useState(false)
  const [visa,         setVisa]         = useState<VisaRequirement | null>(null)
  const [countryList,  setCountryList]  = useState<CountryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const toRegions = COUNTRY_REGIONS[toCode] ?? []
  const selectedToRegion = toRegions.find(r => r.id === toRegionId)

  // 환율이 바뀌면 자동 swap 여부 결정 (rate < 1 이면 from이 약한 통화 → swap)
  useEffect(() => {
    if (exchangeRate !== null) setRateSwapped(exchangeRate < 1)
  }, [exchangeRate])

  // 국가 목록 로드 (드롭다운용)
  useEffect(() => {
    fetch('https://restcountries.com/v3.1/all?fields=cca2,name')
      .then(r => r.json())
      .then((data: Record<string, unknown>[]) => {
        const list: CountryOption[] = data
          .map(c => ({ cca2: c.cca2 as string, name: (c.name as { common: string }).common }))
          .sort((a, b) => a.name.localeCompare(b.name))
        setCountryList(list)
      })
      .catch(() => {})
  }, [])

  const loadData = useCallback(async (from: string, to: string, regionId: string) => {
    setLoading(true)
    setError(null)
    try {
      const [fromRes, toRes] = await Promise.all([
        fetch(`https://restcountries.com/v3.1/alpha/${from}`),
        fetch(`https://restcountries.com/v3.1/alpha/${to}`),
      ])
      if (!fromRes.ok || !toRes.ok) throw new Error('국가 정보를 불러올 수 없습니다.')
      const [fromRaw, toRaw]: [Record<string, unknown>[], Record<string, unknown>[]] = await Promise.all([
        fromRes.json(), toRes.json(),
      ])
      const fromCountry = parseCountry(fromRaw[0])
      const toCountry   = parseCountry(toRaw[0])
      setFromData(fromCountry)
      setToData(toCountry)

      const region  = COUNTRY_REGIONS[to]?.find(r => r.id === regionId)
      const fromCity = fromCountry.capital
      const toCity   = region?.representativeCity ?? toCountry.capital

      const [fromWeatherRes, toWeatherRes, exchangeRes, visaRes] = await Promise.allSettled([
        fetch(`/api/weather/${encodeURIComponent(fromCity)}`),
        fetch(`/api/weather/${encodeURIComponent(toCity)}`),
        fetch(`https://open.er-api.com/v6/latest/${fromCountry.currency.code}`),
        fetch(`/api/visa/${from}/${to}`),
      ])

      setFromWeather(
        fromWeatherRes.status === 'fulfilled' && fromWeatherRes.value.ok
          ? await fromWeatherRes.value.json() : null
      )
      setToWeather(
        toWeatherRes.status === 'fulfilled' && toWeatherRes.value.ok
          ? await toWeatherRes.value.json() : null
      )
      if (exchangeRes.status === 'fulfilled' && exchangeRes.value.ok) {
        const exJson = await exchangeRes.value.json()
        setExchangeRate(exJson?.rates?.[toCountry.currency.code] ?? null)
      } else {
        setExchangeRate(null)
      }
      setVisa(
        visaRes.status === 'fulfilled' && visaRes.value.ok
          ? await visaRes.value.json() : null
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : '데이터 로드 실패')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData(fromCode, toCode, toRegionId)
  }, [fromCode, toCode, toRegionId, loadData])

  // URL 동기화
  useEffect(() => {
    const params = new URLSearchParams({ from: fromCode, to: toCode })
    if (toRegionId) params.set('toRegion', toRegionId)
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [fromCode, toCode, toRegionId, router])

  const timeDiff = fromData && toData ? calcTimeDiff(fromData, toData, selectedToRegion) : null

  const fromTz = fromData ? getTimezoneFromCountry(fromData) : ''
  const toTz   = toData   ? getTimezoneFromCountry(toData, selectedToRegion) : ''
  const fromTimeStr = fromTz ? getCurrentTimeStr(fromTz) : ''
  const toTimeStr   = toTz   ? getCurrentTimeStr(toTz)   : ''

  // 환율 표시 계산
  const displayRate = exchangeRate !== null
    ? (rateSwapped ? 1 / exchangeRate : exchangeRate)
    : null
  const baseSymbol   = fromData && toData
    ? (rateSwapped ? (toData.currency.symbol   || toData.currency.code)   : (fromData.currency.symbol || fromData.currency.code))
    : ''
  const targetSymbol = fromData && toData
    ? (rateSwapped ? (fromData.currency.symbol || fromData.currency.code) : (toData.currency.symbol   || toData.currency.code))
    : ''

  // 전기 표준 (정적 데이터)
  const fromElec = fromData ? getElectrical(fromData.cca2, fromData.region) : null
  const toElec   = toData   ? getElectrical(toData.cca2,   toData.region)   : null
  const adapterStatus = fromElec && toElec ? getAdapterStatus(fromElec, toElec) : null

  const rows: { icon: string; label: string; fromVal: React.ReactNode; toVal: React.ReactNode }[] = fromData && toData ? [
    {
      icon: '⏰',
      label: '현재 시각',
      fromVal: fromTimeStr || '-',
      toVal: toTimeStr ? (
        <span>
          {toTimeStr}
          {timeDiff !== null && timeDiff !== 0 && (
            <span style={{ marginLeft: 6, fontSize: 11, color: timeDiff > 0 ? '#86efac' : '#fca5a5', background: 'rgba(255,255,255,0.05)', borderRadius: 4, padding: '1px 5px' }}>
              {formatTimeDiff(timeDiff)}
            </span>
          )}
        </span>
      ) : '-',
    },
    {
      icon: '⏱',
      label: '시차',
      fromVal: <span style={{ color: '#64748b', fontSize: 12 }}>기준</span>,
      toVal: timeDiff !== null
        ? <span style={{ color: timeDiff === 0 ? '#94a3b8' : timeDiff > 0 ? '#86efac' : '#fca5a5', fontWeight: 600 }}>
            {formatTimeDiff(timeDiff)}
          </span>
        : '-',
    },
    {
      icon: '🌤',
      label: '날씨',
      fromVal: <WeatherCell w={fromWeather} />,
      toVal:   <WeatherCell w={toWeather} />,
    },
    {
      icon: '💱',
      label: '환율',
      fromVal: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {displayRate != null ? `1 ${baseSymbol}` : '-'}
          {exchangeRate != null && (
            <button
              onClick={() => setRateSwapped(v => !v)}
              title="환율 기준 반전"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5, cursor: 'pointer', padding: '1px 5px', color: '#94a3b8', display: 'inline-flex', alignItems: 'center' }}
            >
              <ArrowLeftRight size={11} />
            </button>
          )}
        </span>
      ),
      toVal: displayRate != null
        ? <span style={{ fontWeight: 600, color: '#e2e8f0' }}>= {fmtRate(displayRate)} {targetSymbol}</span>
        : <span style={{ color: '#475569', fontSize: 12 }}>정보 없음</span>,
    },
    {
      icon: '🛂',
      label: '비자',
      fromVal: <span style={{ color: '#64748b', fontSize: 12 }}>{fromData.name} 여권 기준</span>,
      toVal: visa
        ? (
          <span>
            <span style={{
              display: 'inline-block',
              background: visa.color + '22',
              border: `1px solid ${visa.color}55`,
              color: visa.color,
              borderRadius: 5,
              fontSize: 12,
              fontWeight: 700,
              padding: '1px 8px',
              marginRight: 6,
            }}>
              {visa.label_ko}
            </span>
            <span style={{ fontSize: 10, color: '#334155' }}>Passport Index</span>
          </span>
        )
        : <span style={{ color: '#475569', fontSize: 12 }}>조회 중...</span>,
    },
    {
      icon: '🗣',
      label: '언어',
      fromVal: fromData.languages.join(', ') || '-',
      toVal:   toData.languages.join(', ')   || '-',
    },
    {
      icon: '🚗',
      label: '운전',
      fromVal: fromData.drivingSide === 'left' ? '좌측통행' : '우측통행',
      toVal: toData.drivingSide === fromData.drivingSide
        ? <span>{toData.drivingSide === 'left' ? '좌측통행' : '우측통행'} <span style={{ fontSize: 11, color: '#86efac', marginLeft: 4 }}>동일</span></span>
        : <span style={{ color: '#fca5a5' }}>{toData.drivingSide === 'left' ? '좌측통행' : '우측통행'} ⚠</span>,
    },
    {
      icon: '🔌',
      label: '전압',
      fromVal: <ElectricalCell elec={fromElec} />,
      toVal: (
        <span>
          <ElectricalCell elec={toElec} />
          {adapterStatus && (
            <span style={{
              display: 'inline-block',
              marginTop: 4,
              fontSize: 11,
              color: adapterStatus.color,
              background: adapterStatus.color + '18',
              border: `1px solid ${adapterStatus.color}44`,
              borderRadius: 4,
              padding: '1px 7px',
            }}>
              {adapterStatus.label}
            </span>
          )}
        </span>
      ),
    },
    {
      icon: '💰',
      label: '통화',
      fromVal: `${fromData.currency.name} (${fromData.currency.code})`,
      toVal:   `${toData.currency.name} (${toData.currency.code})`,
    },
    {
      icon: '🏙',
      label: '수도',
      fromVal: fromData.capital,
      toVal:   toData.capital,
    },
    {
      icon: '👥',
      label: '인구',
      fromVal: fmtPop(fromData.population),
      toVal:   fmtPop(toData.population),
    },
    {
      icon: '📐',
      label: '면적',
      fromVal: fmtArea(fromData.area),
      toVal:   fmtArea(toData.area),
    },
    {
      icon: '🌏',
      label: '지역',
      fromVal: fromData.region,
      toVal:   toData.region,
    },
  ] : []

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#f1f5f9', padding: '28px 16px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <Link
            href="/"
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#475569', textDecoration: 'none' }}
          >
            <ArrowLeft size={14} /> 지구본으로
          </Link>
          <span style={{ color: '#334155', fontSize: 14 }}>|</span>
          <span style={{ fontSize: 18, fontWeight: 700 }}>✈ 여행 정보</span>
          <button
            onClick={() => loadData(fromCode, toCode, toRegionId)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
          >
            <RefreshCw size={13} /> 새로고침
          </button>
        </div>

        {/* 국가 선택 */}
        <div style={{ ...glass, borderRadius: 14, padding: '20px 20px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>

            {/* FROM */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 140 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '0.07em', textTransform: 'uppercase' }}>출발 국가</label>
              <select value={fromCode} onChange={e => setFromCode(e.target.value)} style={selectStyle}>
                {countryList.map(c => <option key={c.cca2} value={c.cca2}>{c.name}</option>)}
              </select>
            </div>

            <ArrowRight size={18} style={{ color: '#475569', marginTop: 18, flexShrink: 0 }} />

            {/* TO */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 140 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '0.07em', textTransform: 'uppercase' }}>목적지</label>
              <select value={toCode} onChange={e => { setToCode(e.target.value); setToRegionId('') }} style={selectStyle}>
                {countryList.map(c => <option key={c.cca2} value={c.cca2}>{c.name}</option>)}
              </select>
            </div>

            {/* 지역 선택 (대형 국가만) */}
            {toRegions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 160 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#a78bfa', letterSpacing: '0.07em', textTransform: 'uppercase' }}>지역 선택</label>
                <select
                  value={toRegionId}
                  onChange={e => setToRegionId(e.target.value)}
                  style={{ ...selectStyle, borderColor: 'rgba(167,139,250,0.3)' }}
                >
                  <option value="">전체 / 수도권</option>
                  {toRegions.map(r => <option key={r.id} value={r.id}>{r.label_ko}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* 로딩 / 에러 */}
        {loading && (
          <div style={{ textAlign: 'center', color: '#475569', padding: '60px 0', fontSize: 14 }}>
            정보를 불러오는 중...
          </div>
        )}
        {error && !loading && (
          <div style={{ textAlign: 'center', color: '#f87171', padding: '40px 0', fontSize: 14 }}>{error}</div>
        )}

        {/* 비교 테이블 */}
        {!loading && !error && fromData && toData && (
          <>
            {/* 국기 헤더 */}
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 12, marginBottom: 2, padding: '0 4px' }}>
              <div />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src={fromData.flag} alt={fromData.name} style={{ width: 28, height: 18, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{fromData.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src={toData.flag} alt={toData.name} style={{ width: 28, height: 18, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{toData.name}</span>
                  {selectedToRegion && (
                    <div style={{ fontSize: 11, color: '#a78bfa', marginTop: 1 }}>{selectedToRegion.label_ko}</div>
                  )}
                </div>
              </div>
            </div>

            {/* 비교 행 */}
            <div style={{ ...glass, borderRadius: 14, overflow: 'hidden' }}>
              {rows.map((row, i) => (
                <div
                  key={row.label}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 1fr 1fr',
                    gap: 12,
                    padding: '11px 16px',
                    borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>{row.icon}</span>
                    <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{row.label}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#cbd5e1' }}>{row.fromVal}</div>
                  <div style={{ fontSize: 13, color: '#cbd5e1' }}>{row.toVal}</div>
                </div>
              ))}
            </div>

            {/* 여행 팁 */}
            <div style={{ ...glass, borderRadius: 14, padding: '16px 20px', marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>
                💡 여행 팁
              </div>
              <ul style={{ margin: 0, padding: '0 0 0 16px', listStyle: 'disc', color: '#94a3b8', fontSize: 13, lineHeight: 1.8 }}>
                {fromData.currency.code !== toData.currency.code && (
                  <li>현지 통화({toData.currency.code})를 충분히 준비하세요. 소규모 상점은 카드를 받지 않을 수 있습니다.</li>
                )}
                {fromData.drivingSide !== toData.drivingSide && (
                  <li>운전 방향이 다릅니다. 렌터카 이용 시 충분히 적응 후 주행하세요.</li>
                )}
                {timeDiff !== null && Math.abs(timeDiff) >= 6 && (
                  <li>시차가 {formatTimeDiff(timeDiff)}입니다. 도착 후 첫 2~3일은 피로도가 높을 수 있으니 여유 일정을 두세요.</li>
                )}
                {timeDiff !== null && Math.abs(timeDiff) < 2 && timeDiff !== 0 && (
                  <li>시차가 거의 없어 빠르게 적응할 수 있습니다.</li>
                )}
                {toRegions.length > 0 && !selectedToRegion && (
                  <li>{toData.name}은(는) 지역별로 시차와 날씨가 다릅니다. 위의 지역 선택으로 정확한 정보를 확인하세요.</li>
                )}
                <li>출발 전 여권 유효기간(입국 기준 6개월 이상 권장)을 반드시 확인하세요.</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function TravelPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
        로딩 중...
      </div>
    }>
      <TravelPageContent />
    </Suspense>
  )
}
