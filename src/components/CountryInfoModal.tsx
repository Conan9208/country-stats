'use client'

import { useEffect, useState } from 'react'
import { glass } from '@/lib/mapConstants'

type CountryInfo = {
  name: { common: string; official: string }
  flags: { svg: string }
  capital: string[]
  population: number
  area: number
  languages: Record<string, string>
  currencies: Record<string, { name: string; symbol: string }>
  timezones: string[]
  idd: { root: string; suffixes: string[] }
  tld: string[]
  car: { side: string }
  region: string
  subregion: string
}

function fmt(n: number) {
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}억`
  if (n >= 1e4) return `${(n / 1e4).toFixed(0)}만`
  return n.toLocaleString()
}

function fmtArea(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M km²`
  return `${n.toLocaleString()} km²`
}

type Props = { code: string; name: string; onClose: () => void }

export default function CountryInfoModal({ code, name, onClose }: Props) {
  const [info,    setInfo]    = useState<CountryInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  useEffect(() => {
    setLoading(true); setError(false); setInfo(null)
    fetch(`https://restcountries.com/v3.1/alpha/${code}?fields=name,flags,capital,population,area,languages,currencies,timezones,idd,tld,car,region,subregion`)
      .then(r => r.json())
      .then(d => setInfo(Array.isArray(d) ? d[0] : d))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [code])

  const phoneCode = info
    ? (info.idd?.root ?? '') + (info.idd?.suffixes?.[0] ?? '')
    : ''

  const rows = info ? [
    { icon: '🏙️', label: '수도',       value: info.capital?.join(', ') ?? '없음' },
    { icon: '👥', label: '인구',       value: `${fmt(info.population)}명` },
    { icon: '📐', label: '면적',       value: fmtArea(info.area) },
    { icon: '🌍', label: '지역',       value: [info.region, info.subregion].filter(Boolean).join(' / ') },
    { icon: '🗣️', label: '공용어',    value: Object.values(info.languages ?? {}).join(', ') || '정보 없음' },
    { icon: '💰', label: '통화',       value: Object.entries(info.currencies ?? {}).map(([c, v]) => `${v.name} (${c} / ${v.symbol})`).join(', ') || '정보 없음' },
    { icon: '🕐', label: '시간대',     value: info.timezones?.[0] ?? '정보 없음' },
    { icon: '📞', label: '국가번호',   value: phoneCode || '정보 없음' },
    { icon: '🌐', label: '도메인',     value: info.tld?.join(', ') ?? '정보 없음' },
    { icon: '🚗', label: '운전 방향',  value: info.car?.side === 'left' ? '좌측통행' : '우측통행' },
  ] : []

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ ...glass, borderRadius: 20, width: 480, maxHeight: '85vh', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(99,102,241,0.3) transparent' }}
      >
        {/* 헤더 */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'rgba(9,9,11,0.95)', borderRadius: '20px 20px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {info?.flags?.svg && (
              <img src={info.flags.svg} alt="" style={{ height: 22, borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)' }} />
            )}
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{info?.name?.common ?? name}</div>
              {info?.name?.official && info.name.official !== info.name.common && (
                <div style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>{info.name.official}</div>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#64748b', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {loading && <div style={{ textAlign: 'center', color: '#334155', padding: '40px 0' }}>불러오는 중...</div>}
          {error   && <div style={{ textAlign: 'center', color: '#f87171', padding: '40px 0' }}>정보를 불러오지 못했어요</div>}

          {info && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {rows.map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '9px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)' }}>
                  <span style={{ fontSize: 15, flexShrink: 0, width: 22, textAlign: 'center' }}>{row.icon}</span>
                  <span style={{ fontSize: 11, color: '#475569', fontWeight: 700, width: 60, flexShrink: 0, paddingTop: 1 }}>{row.label}</span>
                  <span style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.4 }}>{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
