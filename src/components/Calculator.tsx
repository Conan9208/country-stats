'use client'

import { useEffect, useState, useMemo } from 'react'

type CalcTab = 'exchange' | 'compare' | 'ranking'
type Rates = Record<string, number>

type CountryBasic = {
  name: { common: string }
  flags: { svg: string }
  cca2: string
  population: number
  area: number
  region: string
  capital?: string[]
  languages?: Record<string, string>
  currencies?: Record<string, { name: string; symbol: string }>
}

const CALC_TABS = [
  { id: 'exchange', label: '💱 환율 계산기' },
  { id: 'compare', label: '⚖️ 국가 비교' },
  { id: 'ranking', label: '🏆 세계 순위' },
]

const POPULAR_CURRENCIES = [
  'USD', 'EUR', 'KRW', 'JPY', 'CNY', 'GBP', 'AUD', 'CAD', 'CHF',
  'HKD', 'SGD', 'INR', 'BRL', 'MXN', 'NOK', 'SEK', 'DKK', 'NZD', 'ZAR', 'THB',
]

const REGIONS = ['전체', 'Africa', 'Americas', 'Asia', 'Europe', 'Oceania']

export default function Calculator() {
  const [activeTab, setActiveTab] = useState<CalcTab>('exchange')

  // ── Exchange rate state ──────────────────────────────────
  const [rates, setRates] = useState<Rates | null>(null)
  const [ratesLoading, setRatesLoading] = useState(true)
  const [fromCurrency, setFromCurrency] = useState('USD')
  const [toCurrency, setToCurrency] = useState('KRW')
  const [amount, setAmount] = useState('1')

  // ── Country data state ───────────────────────────────────
  const [countries, setCountries] = useState<CountryBasic[]>([])
  const [countriesLoading, setCountriesLoading] = useState(true)

  // ── Compare state ────────────────────────────────────────
  const [country1, setCountry1] = useState('US')
  const [country2, setCountry2] = useState('KR')

  // ── Ranking state ────────────────────────────────────────
  const [rankBy, setRankBy] = useState<'population' | 'area'>('population')
  const [rankRegion, setRankRegion] = useState('전체')

  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(d => { setRates(d.rates); setRatesLoading(false) })
      .catch(() => setRatesLoading(false))
  }, [])

  useEffect(() => {
    fetch('https://restcountries.com/v3.1/all?fields=name,flags,population,area,region,capital,languages,currencies,cca2')
      .then(r => r.json())
      .then((data: CountryBasic[]) => {
        setCountries(data.sort((a, b) => a.name.common.localeCompare(b.name.common)))
        setCountriesLoading(false)
      })
      .catch(() => setCountriesLoading(false))
  }, [])

  // Derived values
  const convertedAmount = useMemo(() => {
    if (!rates || !amount) return null
    const num = parseFloat(amount)
    if (isNaN(num) || num < 0) return null
    return (num / (rates[fromCurrency] ?? 1)) * (rates[toCurrency] ?? 1)
  }, [rates, amount, fromCurrency, toCurrency])

  const c1 = useMemo(() => countries.find(c => c.cca2 === country1), [countries, country1])
  const c2 = useMemo(() => countries.find(c => c.cca2 === country2), [countries, country2])

  const ranked = useMemo(() => {
    let list = [...countries]
    if (rankRegion !== '전체') list = list.filter(c => c.region === rankRegion)
    list.sort((a, b) => ((b[rankBy] as number) ?? 0) - ((a[rankBy] as number) ?? 0))
    return list.slice(0, 20)
  }, [countries, rankBy, rankRegion])

  const availableCurrencies = useMemo(
    () => rates ? [...new Set([...POPULAR_CURRENCIES, ...Object.keys(rates).sort()])] : POPULAR_CURRENCIES,
    [rates]
  )

  const exchangeRate = rates
    ? ((rates[toCurrency] ?? 1) / (rates[fromCurrency] ?? 1))
    : null

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950">
      {/* Sub-tabs */}
      <div className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 flex gap-0">
          {CALC_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as CalcTab)}
              className={`px-5 py-3 text-sm font-medium transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-white text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* ── 환율 계산기 ────────────────────────────────── */}
        {activeTab === 'exchange' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">💱 환율 계산기</h2>
              <p className="text-zinc-500 text-sm mt-1">실시간 환율 기준 · open.er-api.com</p>
            </div>

            {ratesLoading ? (
              <div className="bg-zinc-900 rounded-2xl h-56 animate-pulse" />
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
                {/* From */}
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400 font-medium uppercase tracking-wide">변환할 금액</label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-xl font-mono focus:outline-none focus:border-zinc-500 transition-colors"
                      placeholder="0"
                      min="0"
                    />
                    <select
                      value={fromCurrency}
                      onChange={e => setFromCurrency(e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-500 min-w-[90px] text-sm"
                    >
                      {availableCurrencies.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Swap */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-zinc-800" />
                  <button
                    onClick={() => { setFromCurrency(toCurrency); setToCurrency(fromCurrency) }}
                    className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-full w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-white transition-all text-base"
                    title="통화 교체"
                  >
                    ⇅
                  </button>
                  <div className="flex-1 h-px bg-zinc-800" />
                </div>

                {/* To */}
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400 font-medium uppercase tracking-wide">변환 결과</label>
                  <div className="flex gap-3">
                    <div className="flex-1 bg-zinc-800/40 border border-zinc-700 rounded-xl px-4 py-3 text-white text-xl font-mono select-all">
                      {convertedAmount !== null
                        ? convertedAmount >= 1
                          ? convertedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })
                          : convertedAmount.toLocaleString(undefined, { minimumSignificantDigits: 4, maximumSignificantDigits: 6 })
                        : '—'}
                    </div>
                    <select
                      value={toCurrency}
                      onChange={e => setToCurrency(e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-500 min-w-[90px] text-sm"
                    >
                      {availableCurrencies.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Rate summary */}
                {exchangeRate !== null && (
                  <div className="bg-zinc-950/60 rounded-xl px-4 py-3 text-center text-xs text-zinc-500">
                    1 {fromCurrency} ={' '}
                    <span className="text-zinc-300 font-mono">
                      {exchangeRate >= 1
                        ? exchangeRate.toLocaleString(undefined, { maximumFractionDigits: 4 })
                        : exchangeRate.toLocaleString(undefined, { minimumSignificantDigits: 4, maximumSignificantDigits: 5 })}
                    </span>{' '}
                    {toCurrency}
                  </div>
                )}
              </div>
            )}

            {/* Quick reference */}
            {rates && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-300">주요 통화 ({fromCurrency} 기준)</h3>
                  <span className="text-xs text-zinc-600">클릭하면 선택됩니다</span>
                </div>
                <div className="divide-y divide-zinc-800/60">
                  {['USD', 'EUR', 'KRW', 'JPY', 'CNY', 'GBP', 'AUD', 'HKD', 'SGD', 'CHF', 'THB', 'INR']
                    .filter(c => c !== fromCurrency)
                    .map(c => {
                      const rate = (rates[c] ?? 1) / (rates[fromCurrency] ?? 1)
                      const isSelected = toCurrency === c
                      return (
                        <div
                          key={c}
                          className={`flex items-center justify-between px-5 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-zinc-800' : 'hover:bg-zinc-800/40'}`}
                          onClick={() => setToCurrency(c)}
                        >
                          <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-zinc-400'}`}>{c}</span>
                          <span className="text-sm font-mono text-zinc-200">
                            {rate >= 100
                              ? rate.toLocaleString(undefined, { maximumFractionDigits: 2 })
                              : rate >= 1
                              ? rate.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })
                              : rate.toLocaleString(undefined, { minimumSignificantDigits: 4, maximumSignificantDigits: 5 })}
                          </span>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 국가 비교 ───────────────────────────────────── */}
        {activeTab === 'compare' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">⚖️ 국가 비교</h2>
              <p className="text-zinc-500 text-sm mt-1">두 나라를 나란히 비교해보세요</p>
            </div>

            {countriesLoading ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900 rounded-2xl h-32 animate-pulse" />
                <div className="bg-zinc-900 rounded-2xl h-32 animate-pulse" />
              </div>
            ) : (
              <>
                {/* Selectors */}
                <div className="grid grid-cols-2 gap-4">
                  {([{ value: country1, set: setCountry1 }, { value: country2, set: setCountry2 }] as const).map(
                    ({ value, set }, i) => {
                      const c = countries.find(x => x.cca2 === value)
                      return (
                        <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
                          <select
                            value={value}
                            onChange={e => set(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-zinc-600"
                          >
                            {countries.map(c => (
                              <option key={c.cca2} value={c.cca2}>{c.name.common}</option>
                            ))}
                          </select>
                          {c && (
                            <div className="flex items-center gap-3">
                              <img src={c.flags.svg} alt={c.name.common} className="w-12 h-8 object-cover rounded" />
                              <div>
                                <p className="font-semibold text-white text-sm">{c.name.common}</p>
                                <p className="text-zinc-500 text-xs">{c.region}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    }
                  )}
                </div>

                {/* Comparison rows */}
                {c1 && c2 && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                    {(
                      [
                        { label: '🏙️ 수도', type: 'text', v1: c1.capital?.[0] ?? '—', v2: c2.capital?.[0] ?? '—' },
                        { label: '👥 인구', type: 'bar', v1: c1.population, v2: c2.population, fmt: (n: number) => n >= 1e8 ? (n / 1e8).toFixed(2) + '억명' : n >= 1e4 ? (n / 1e4).toFixed(1) + '만명' : n.toLocaleString() + '명' },
                        { label: '📐 면적 (km²)', type: 'bar', v1: c1.area ?? 0, v2: c2.area ?? 0, fmt: (n: number) => n.toLocaleString() + ' km²' },
                        { label: '🌐 지역', type: 'text', v1: c1.region, v2: c2.region },
                        { label: '🗣️ 언어', type: 'text', v1: Object.values(c1.languages ?? {}).slice(0, 2).join(', ') || '—', v2: Object.values(c2.languages ?? {}).slice(0, 2).join(', ') || '—' },
                        { label: '💰 통화', type: 'text', v1: Object.entries(c1.currencies ?? {}).map(([code, { symbol }]) => `${code}(${symbol})`).join(', ') || '—', v2: Object.entries(c2.currencies ?? {}).map(([code, { symbol }]) => `${code}(${symbol})`).join(', ') || '—' },
                      ] as Array<{
                        label: string
                        type: 'text' | 'bar'
                        v1: string | number
                        v2: string | number
                        fmt?: (n: number) => string
                      }>
                    ).map((row, idx) => (
                      <div
                        key={idx}
                        className={`grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-4 ${idx > 0 ? 'border-t border-zinc-800/70' : ''}`}
                      >
                        {row.type === 'bar' ? (
                          <>
                            <div className="text-right space-y-1.5">
                              <p className="text-sm text-white font-mono">{row.fmt!(row.v1 as number)}</p>
                              <div className="flex justify-end">
                                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden w-28">
                                  <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.max(row.v1 as number, row.v2 as number) > 0 ? ((row.v1 as number) / Math.max(row.v1 as number, row.v2 as number)) * 100 : 0}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                            <span className="text-xs text-zinc-600 font-medium whitespace-nowrap text-center px-2">{row.label}</span>
                            <div className="text-left space-y-1.5">
                              <p className="text-sm text-white font-mono">{row.fmt!(row.v2 as number)}</p>
                              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden w-28">
                                <div
                                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.max(row.v1 as number, row.v2 as number) > 0 ? ((row.v2 as number) / Math.max(row.v1 as number, row.v2 as number)) * 100 : 0}%` }}
                                />
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-zinc-300 text-right">{String(row.v1)}</p>
                            <span className="text-xs text-zinc-600 font-medium whitespace-nowrap text-center px-2">{row.label}</span>
                            <p className="text-sm text-zinc-300 text-left">{String(row.v2)}</p>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── 세계 순위 ───────────────────────────────────── */}
        {activeTab === 'ranking' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">🏆 세계 순위</h2>
              <p className="text-zinc-500 text-sm mt-1">Top 20 · 기준을 바꿔가며 비교해보세요</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(['population', 'area'] as const).map(key => (
                <button
                  key={key}
                  onClick={() => setRankBy(key)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    rankBy === key ? 'bg-white text-zinc-950' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {key === 'population' ? '👥 인구' : '📐 면적'}
                </button>
              ))}
              <div className="w-px bg-zinc-800 mx-1" />
              {REGIONS.map(r => (
                <button
                  key={r}
                  onClick={() => setRankRegion(r)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    rankRegion === r
                      ? 'bg-zinc-600 text-white'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:bg-zinc-800'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {countriesLoading ? (
              <div className="bg-zinc-900 rounded-2xl h-96 animate-pulse" />
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                {ranked.map((country, idx) => {
                  const value = (country[rankBy] as number) ?? 0
                  const max = ((ranked[0]?.[rankBy] as number) ?? 1)
                  const pct = max > 0 ? (value / max) * 100 : 0
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
                  const displayValue = rankBy === 'population'
                    ? value >= 1e9
                      ? (value / 1e9).toFixed(2) + 'B'
                      : value >= 1e6
                      ? (value / 1e6).toFixed(1) + 'M'
                      : value.toLocaleString()
                    : value >= 1e6
                    ? (value / 1e6).toFixed(2) + 'M km²'
                    : value.toLocaleString() + ' km²'

                  return (
                    <div
                      key={country.cca2}
                      className={`flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-zinc-800/40 ${idx > 0 ? 'border-t border-zinc-800/60' : ''}`}
                    >
                      <span className="w-8 text-center text-sm">
                        {medal ?? <span className="text-zinc-600 font-bold">{idx + 1}</span>}
                      </span>
                      <img
                        src={country.flags.svg}
                        alt={country.name.common}
                        className="w-9 h-6 object-cover rounded flex-shrink-0"
                      />
                      <span className="text-sm text-zinc-200 flex-1 min-w-0 truncate">{country.name.common}</span>
                      <div className="hidden sm:flex items-center gap-2 w-36">
                        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              background: idx === 0 ? '#eab308' : idx === 1 ? '#a1a1aa' : '#78716c',
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-mono text-zinc-300 text-right min-w-[96px]">
                        {displayValue}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
