'use client'

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, ArrowLeftRight, RefreshCw } from 'lucide-react'
import { useLocale } from 'next-intl'
import isoCountries from 'i18n-iso-countries'
import localeKo from 'i18n-iso-countries/langs/ko.json'
import localeEn from 'i18n-iso-countries/langs/en.json'
import { COUNTRY_REGIONS } from '@/data/countryRegions'
import { getWeatherLabel } from '@/lib/weatherCodes'
import { getElectrical, getAdapterStatus, PLUG_TYPE_LABELS } from '@/data/electricalStandards'
import {
  calcTimeDiff, formatTimeDiff, getCurrentTimeStr, getTimezoneFromCountry,
  fmtRate, fmtPop, fmtArea,
} from '@/lib/travelUtils'
import type { CountryBasic, WeatherInfo, VisaRequirement } from '@/types/travel'
import type { ElectricalStandard } from '@/data/electricalStandards'

isoCountries.registerLocale(localeKo)
isoCountries.registerLocale(localeEn)

// ─── 날씨 셀 ────────────────────────────────────────────────────────────────

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

// ─── 전기 표준 셀 ────────────────────────────────────────────────────────────

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
      <span style={{ display: 'block', fontSize: 11, color: '#64748b', marginTop: 2 }}>{plugDesc}</span>
      {elec.note && (
        <span style={{ display: 'block', fontSize: 10, color: '#fbbf24', marginTop: 2, lineHeight: 1.4 }}>
          ⚠ {elec.note}
        </span>
      )}
    </span>
  )
}

// ─── 옷차림 추천 ─────────────────────────────────────────────────────────────

function getClothingAdvice(weather: WeatherInfo | null): { items: string[]; urgentNote?: string } | null {
  if (!weather) return null
  const temp = weather.temp_c
  const code = weather.weather_code

  const items: string[] = []

  if (temp < 0) {
    items.push('두꺼운 패딩 또는 다운 재킷 (필수)')
    items.push('히트텍·울 내복 등 레이어링')
    items.push('방한 장갑, 귀마개, 털모자')
    items.push('방한 방수 부츠')
    items.push('두꺼운 머플러')
  } else if (temp < 5) {
    items.push('두꺼운 코트 또는 패딩')
    items.push('스웨터나 후리스 레이어링')
    items.push('장갑, 목도리, 모자')
    items.push('보온 부츠')
  } else if (temp < 10) {
    items.push('두꺼운 자켓 또는 코트')
    items.push('니트 스웨터')
    items.push('목도리')
    items.push('가벼운 부츠 또는 방한 신발')
  } else if (temp < 15) {
    items.push('가을용 자켓 또는 트렌치코트')
    items.push('얇은 스웨터 또는 긴팔')
    items.push('긴바지 (청바지 등)')
  } else if (temp < 20) {
    items.push('가디건 또는 얇은 자켓')
    items.push('긴팔 티셔츠')
    items.push('면 바지 또는 얇은 긴바지')
  } else if (temp < 25) {
    items.push('반팔 티셔츠')
    items.push('얇은 긴팔 (저녁·냉방 대비)')
    items.push('면 바지 또는 가벼운 긴바지')
  } else if (temp < 30) {
    items.push('반팔·반바지 등 여름 의류')
    items.push('자외선 차단 모자·선글라스')
    items.push('냉방 대비 얇은 카디건')
  } else {
    items.push('통기성 좋은 가벼운 여름 의류')
    items.push('자외선 차단 필수 (모자, 선글라스, 선크림)')
    items.push('수분 보충 위한 물통 지참')
  }

  const isRain = [176, 182, 263, 266, 281, 284, 293, 296, 299, 302, 305, 308, 311, 314, 317, 320, 353, 356, 359, 362, 365].includes(code)
  const isSnow = [179, 227, 230, 323, 326, 329, 332, 335, 338, 350, 368, 371, 374, 377].includes(code)
  const isThunder = [200, 386, 389, 392, 395].includes(code)

  if (isRain) items.push('우산 또는 방수 재킷 필지')
  if (isSnow) items.push('미끄럼 방지 방수 부츠')
  const urgentNote = isThunder ? '⚡ 뇌우 예보 — 실외 활동 자제 권장' : undefined

  return { items, urgentNote }
}

// ─── 스타일 ──────────────────────────────────────────────────────────────────

const glass: React.CSSProperties = {
  background: 'rgba(9,9,11,0.82)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
}

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

// ─── 국가 검색 컴포넌트 ──────────────────────────────────────────────────────

interface CountryOption { cca2: string; nameEn: string; nameKo: string; flag: string }

function CountrySearchInput({
  value,
  onChange,
  options,
  label,
}: {
  value: string
  onChange: (code: string) => void
  options: CountryOption[]
  label: string
}) {
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const filtered = useMemo(() => {
    if (!query.trim()) return options
    const q = query.toLowerCase()
    return options.filter(o =>
      o.nameEn.toLowerCase().includes(q) ||
      o.nameKo.toLowerCase().includes(q) ||
      o.cca2.toLowerCase() === q
    ).slice(0, 80)
  }, [query, options])

  const selected = options.find(o => o.cca2 === value)
  const displayName = selected
    ? (locale === 'ko' ? selected.nameKo : selected.nameEn)
    : (locale === 'ko' ? '선택...' : 'Select...')

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </label>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ ...selectStyle, display: 'flex', alignItems: 'center', gap: 7, width: '100%', justifyContent: 'space-between' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden' }}>
          {selected && (
            <img src={selected.flag} alt="" style={{ width: 20, height: 13, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />
          )}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
        </span>
        <span style={{ color: '#64748b', fontSize: 10, flexShrink: 0 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: '100%', minWidth: 220, zIndex: 200,
          background: '#18181b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
          overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
        }}>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={locale === 'ko' ? '국가 검색 (한/영)...' : 'Search country (KO/EN)...'}
            style={{
              width: '100%', background: '#27272a', border: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#f1f5f9',
              padding: '9px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }}
          />
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <div style={{ padding: '12px 16px', fontSize: 12, color: '#475569', textAlign: 'center' }}>
                {locale === 'ko' ? '결과 없음' : 'No results'}
              </div>
            )}
            {filtered.map(o => (
              <button
                key={o.cca2}
                onClick={() => { onChange(o.cca2); setOpen(false); setQuery('') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '7px 12px', fontSize: 13,
                  color: o.cca2 === value ? '#a78bfa' : '#e2e8f0',
                  background: o.cca2 === value ? 'rgba(167,139,250,0.1)' : 'none',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = o.cca2 === value ? 'rgba(167,139,250,0.1)' : 'none' }}
              >
                <img src={o.flag} alt="" style={{ width: 20, height: 13, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {locale === 'ko' ? o.nameKo : o.nameEn}
                </span>
                <span style={{ fontSize: 10, color: '#475569', flexShrink: 0 }}>{o.cca2}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 메인 클라이언트 컴포넌트 ────────────────────────────────────────────────

export interface TravelClientProps {
  fromData: CountryBasic
  toData: CountryBasic
  visa: VisaRequirement | null
}

function TravelClientContent({ fromData, toData, visa }: TravelClientProps) {
  const locale   = useLocale()
  const router   = useRouter()
  const searchParams = useSearchParams()

  const toRegionId = searchParams.get('region') ?? ''

  const [fromWeather,  setFromWeather]  = useState<WeatherInfo | null>(null)
  const [toWeather,    setToWeather]    = useState<WeatherInfo | null>(null)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [rateSwapped,  setRateSwapped]  = useState(false)
  const [countryList,  setCountryList]  = useState<CountryOption[]>([])
  const [weatherLoading, setWeatherLoading] = useState(true)

  const toRegions       = COUNTRY_REGIONS[toData.cca2] ?? []
  const selectedToRegion = toRegions.find(r => r.id === toRegionId)

  // 국가 목록 (검색용)
  useEffect(() => {
    fetch('/api/countries')
      .then(r => r.json())
      .then((data: Record<string, unknown>[]) => {
        const list: CountryOption[] = data
          .map(c => ({
            cca2: c.cca2 as string,
            nameEn: (c.name as { common: string }).common,
            nameKo: isoCountries.getName(c.cca2 as string, 'ko') ?? (c.name as { common: string }).common,
            flag: (c.flags as { svg: string }).svg,
          }))
          .sort((a, b) => a.nameEn.localeCompare(b.nameEn))
        setCountryList(list)
      })
      .catch(() => {})
  }, [])

  // 날씨 + 환율 fetch (실시간)
  const loadWeatherAndRate = useCallback(async (from: CountryBasic, to: CountryBasic, regionId: string) => {
    await Promise.resolve()
    setWeatherLoading(true)
    setFromWeather(null)
    setToWeather(null)
    setExchangeRate(null)
    setRateSwapped(false)

    const region  = COUNTRY_REGIONS[to.cca2]?.find(r => r.id === regionId)
    const fromCity = from.capital
    const toCity   = region?.representativeCity ?? to.capital

    const [fromWeatherRes, toWeatherRes, exchangeRes] = await Promise.allSettled([
      fetch(`/api/weather/${encodeURIComponent(fromCity)}`),
      fetch(`/api/weather/${encodeURIComponent(toCity)}`),
      fetch(`https://open.er-api.com/v6/latest/${from.currency.code}`),
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
      const nextRate = exJson?.rates?.[to.currency.code] ?? null
      setExchangeRate(nextRate)
      if (nextRate !== null) setRateSwapped(nextRate < 1)
    } else {
      setExchangeRate(null)
    }
    setWeatherLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadWeatherAndRate(fromData, toData, toRegionId)
    }, 0)
    return () => clearTimeout(timer)
  }, [fromData, toData, toRegionId, loadWeatherAndRate])

  // 국가 변경 → 새 경로로 이동 (SSR 재실행)
  const handleFromChange = (code: string) => {
    const toCode = toData.cca2 === code ? (code === 'US' ? 'JP' : 'US') : toData.cca2
    router.push(`/${locale}/travel/${code}/${toCode}`)
  }
  const handleToChange = (code: string) => {
    router.push(`/${locale}/travel/${fromData.cca2}/${code}`)
  }

  // 지역 변경 → query param 업데이트
  const handleRegionChange = (regionId: string) => {
    if (regionId) {
      router.replace(`?region=${encodeURIComponent(regionId)}`, { scroll: false })
    } else {
      router.replace(`/${locale}/travel/${fromData.cca2}/${toData.cca2}`, { scroll: false })
    }
  }

  // ─── 계산 ─────────────────────────────────────────────────────────────────

  const timeDiff    = calcTimeDiff(fromData, toData, selectedToRegion)
  const fromTz      = getTimezoneFromCountry(fromData)
  const toTz        = getTimezoneFromCountry(toData, selectedToRegion)
  const fromTimeStr = fromTz ? getCurrentTimeStr(fromTz) : ''
  const toTimeStr   = toTz   ? getCurrentTimeStr(toTz)   : ''

  const displayRate   = exchangeRate !== null ? (rateSwapped ? 1 / exchangeRate : exchangeRate) : null
  const baseSymbol    = rateSwapped ? (toData.currency.symbol   || toData.currency.code)   : (fromData.currency.symbol || fromData.currency.code)
  const targetSymbol  = rateSwapped ? (fromData.currency.symbol || fromData.currency.code) : (toData.currency.symbol   || toData.currency.code)

  const fromElec     = getElectrical(fromData.cca2, fromData.region)
  const toElec       = getElectrical(toData.cca2,   toData.region)
  const adapterStatus = fromElec && toElec ? getAdapterStatus(fromElec, toElec) : null

  // ─── 비교 행 ───────────────────────────────────────────────────────────────

  const rows: { icon: string; label: string; fromVal: React.ReactNode; toVal: React.ReactNode }[] = [
    {
      icon: '⏰', label: '현재 시각',
      fromVal: fromTimeStr || '-',
      toVal: toTimeStr ? (
        <span>
          {toTimeStr}
          {timeDiff !== 0 && (
            <span style={{ marginLeft: 6, fontSize: 11, color: timeDiff > 0 ? '#86efac' : '#fca5a5', background: 'rgba(255,255,255,0.05)', borderRadius: 4, padding: '1px 5px' }}>
              {formatTimeDiff(timeDiff)}
            </span>
          )}
        </span>
      ) : '-',
    },
    {
      icon: '⏱', label: '시차',
      fromVal: <span style={{ color: '#64748b', fontSize: 12 }}>기준</span>,
      toVal: <span style={{ color: timeDiff === 0 ? '#94a3b8' : timeDiff > 0 ? '#86efac' : '#fca5a5', fontWeight: 600 }}>
        {formatTimeDiff(timeDiff)}
      </span>,
    },
    {
      icon: '🌤', label: '날씨',
      fromVal: weatherLoading ? <span style={{ color: '#475569', fontSize: 12 }}>로딩 중...</span> : <WeatherCell w={fromWeather} />,
      toVal:   weatherLoading ? <span style={{ color: '#475569', fontSize: 12 }}>로딩 중...</span> : <WeatherCell w={toWeather} />,
    },
    {
      icon: '💱', label: '환율',
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
        : <span style={{ color: '#475569', fontSize: 12 }}>{weatherLoading ? '로딩 중...' : '정보 없음'}</span>,
    },
    {
      icon: '🛂', label: '비자',
      fromVal: <span style={{ color: '#64748b', fontSize: 12 }}>{fromData.name} 여권 기준</span>,
      toVal: visa ? (
        <span>
          <span style={{
            display: 'inline-block', background: visa.color + '22',
            border: `1px solid ${visa.color}55`, color: visa.color,
            borderRadius: 5, fontSize: 12, fontWeight: 700, padding: '1px 8px', marginRight: 6,
          }}>{visa.label_ko}</span>
          <span style={{ fontSize: 10, color: '#334155' }}>Passport Index</span>
        </span>
      ) : <span style={{ color: '#475569', fontSize: 12 }}>정보 없음</span>,
    },
    {
      icon: '🗣', label: '언어',
      fromVal: fromData.languages.join(', ') || '-',
      toVal:   toData.languages.join(', ')   || '-',
    },
    {
      icon: '🚗', label: '운전',
      fromVal: fromData.drivingSide === 'left' ? '좌측통행' : '우측통행',
      toVal: toData.drivingSide === fromData.drivingSide
        ? <span>{toData.drivingSide === 'left' ? '좌측통행' : '우측통행'} <span style={{ fontSize: 11, color: '#86efac', marginLeft: 4 }}>동일</span></span>
        : <span style={{ color: '#fca5a5' }}>{toData.drivingSide === 'left' ? '좌측통행' : '우측통행'} ⚠</span>,
    },
    {
      icon: '🔌', label: '전압',
      fromVal: <ElectricalCell elec={fromElec} />,
      toVal: (
        <span>
          <ElectricalCell elec={toElec} />
          {adapterStatus && (
            <span style={{
              display: 'inline-block', marginTop: 4, fontSize: 11,
              color: adapterStatus.color, background: adapterStatus.color + '18',
              border: `1px solid ${adapterStatus.color}44`, borderRadius: 4, padding: '1px 7px',
            }}>{adapterStatus.label}</span>
          )}
        </span>
      ),
    },
    {
      icon: '💰', label: '통화',
      fromVal: `${fromData.currency.name} (${fromData.currency.code})`,
      toVal:   `${toData.currency.name} (${toData.currency.code})`,
    },
    {
      icon: '🏙', label: '수도',
      fromVal: fromData.capital,
      toVal:   toData.capital,
    },
    {
      icon: '👥', label: '인구',
      fromVal: fmtPop(fromData.population),
      toVal:   fmtPop(toData.population),
    },
    {
      icon: '📐', label: '면적',
      fromVal: fmtArea(fromData.area),
      toVal:   fmtArea(toData.area),
    },
    {
      icon: '🌏', label: '지역',
      fromVal: fromData.region,
      toVal:   toData.region,
    },
  ]

  // ─── 렌더 ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#f1f5f9', padding: '28px 16px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#475569', textDecoration: 'none' }}>
            <ArrowLeft size={14} /> 지구본으로
          </Link>
          <span style={{ color: '#334155', fontSize: 14 }}>|</span>
          <span style={{ fontSize: 18, fontWeight: 700 }}>✈ 여행 정보</span>
          <button
            onClick={() => loadWeatherAndRate(fromData, toData, toRegionId)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
          >
            <RefreshCw size={13} /> 새로고침
          </button>
        </div>

        {/* 국가 선택 */}
        <div style={{ ...glass, borderRadius: 14, padding: '20px 20px 16px', marginBottom: 16, position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>

            {/* FROM */}
            <div style={{ flex: 1, minWidth: 140 }}>
              <CountrySearchInput value={fromData.cca2} onChange={handleFromChange} options={countryList} label="출발 국가" />
            </div>

            <ArrowRight size={18} style={{ color: '#475569', marginTop: 18, flexShrink: 0 }} />

            {/* TO */}
            <div style={{ flex: 1, minWidth: 140 }}>
              <CountrySearchInput value={toData.cca2} onChange={handleToChange} options={countryList} label="목적지" />
            </div>

            {/* 지역 선택 (대형 국가만) */}
            {toRegions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 160 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#a78bfa', letterSpacing: '0.07em', textTransform: 'uppercase' }}>지역 선택</label>
                <select
                  value={toRegionId}
                  onChange={e => handleRegionChange(e.target.value)}
                  style={{ ...selectStyle, borderColor: 'rgba(167,139,250,0.3)' }}
                >
                  <option value="">전체 / 수도권</option>
                  {toRegions.map(r => <option key={r.id} value={r.id}>{r.label_ko}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

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

        {/* 비교 테이블 */}
        <div style={{ ...glass, borderRadius: 14, overflow: 'hidden' }}>
          {rows.map((row, i) => (
            <div
              key={row.label}
              style={{
                display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 12,
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

        {/* 옷차림 추천 */}
        {(() => {
          const advice = getClothingAdvice(toWeather)
          if (!advice) return null
          const regionLabel = selectedToRegion?.label_ko ?? toData.name
          return (
            <div style={{ ...glass, borderRadius: 14, padding: '16px 20px', marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>
                👗 옷차림 추천
                <span style={{ marginLeft: 8, fontSize: 10, color: '#64748b', textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>
                  ({regionLabel} 현재 날씨 기준)
                </span>
              </div>
              {advice.urgentNote && (
                <div style={{ marginBottom: 10, padding: '6px 10px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 8, fontSize: 12, color: '#fbbf24' }}>
                  {advice.urgentNote}
                </div>
              )}
              <ul style={{ margin: 0, padding: '0 0 0 16px', listStyle: 'disc', color: '#94a3b8', fontSize: 13, lineHeight: 1.8 }}>
                {advice.items.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
              {weatherLoading && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#475569' }}>날씨 데이터 로딩 중...</div>
              )}
            </div>
          )
        })()}

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
            {Math.abs(timeDiff) >= 6 && (
              <li>시차가 {formatTimeDiff(timeDiff)}입니다. 도착 후 첫 2~3일은 피로도가 높을 수 있으니 여유 일정을 두세요.</li>
            )}
            {Math.abs(timeDiff) < 2 && timeDiff !== 0 && (
              <li>시차가 거의 없어 빠르게 적응할 수 있습니다.</li>
            )}
            {toRegions.length > 0 && !selectedToRegion && (
              <li>{toData.name}은(는) 지역별로 시차와 날씨가 다릅니다. 위의 지역 선택으로 정확한 정보를 확인하세요.</li>
            )}
            <li>출발 전 여권 유효기간(입국 기준 6개월 이상 권장)을 반드시 확인하세요.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// Suspense 래퍼 (useSearchParams 때문에 필요)
export default function TravelClient(props: TravelClientProps) {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
        로딩 중...
      </div>
    }>
      <TravelClientContent {...props} />
    </Suspense>
  )
}
