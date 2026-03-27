'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

const WorldMap = dynamic(() => import('@/components/WorldMap'), { ssr: false })

interface Country {
  name: { common: string; official: string }
  flags: { svg: string; png: string }
  population: number
  region: string
  subregion?: string
  capital?: string[]
  languages?: Record<string, string>
  cca2: string
}

const tabs = [
  { id: 'list', label: '🗂️ 국가 목록' },
  { id: 'map', label: '🗺️ 세계 지도' },
]

export default function Home() {
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list')

  const [countries, setCountries] = useState<Country[]>([])
  const [search, setSearch] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('전체')
  const [loading, setLoading] = useState(true)

  const regions = ['전체', 'Africa', 'Americas', 'Asia', 'Europe', 'Oceania']

  useEffect(() => {
    fetch('https://restcountries.com/v3.1/all?fields=name,flags,population,region,subregion,capital,languages,cca2')
      .then(res => res.json())
      .then(data => {
        const sorted = data.sort((a: Country, b: Country) =>
          a.name.common.localeCompare(b.name.common)
        )
        setCountries(sorted)
        setLoading(false)
      })
  }, [])

  const filtered = useMemo(() => {
    let result = countries
    if (selectedRegion !== '전체') {
      result = result.filter(c => c.region === selectedRegion)
    }
    if (search) {
      result = result.filter(c =>
        c.name.common.toLowerCase().includes(search.toLowerCase()) ||
        c.capital?.[0]?.toLowerCase().includes(search.toLowerCase())
      )
    }
    return result
  }, [search, selectedRegion, countries])

  return (
    <main className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">🌍 WorldStats</h1>
            <p className="text-zinc-400 text-sm">글로벌 국가 비교 · 통계 정보</p>
          </div>
          {activeTab === 'list' && (
            <Badge variant="outline" className="text-zinc-400 border-zinc-700">
              {filtered.length}개국
            </Badge>
          )}
        </div>

        {/* 탭 */}
        <div className="max-w-7xl mx-auto px-6 flex gap-0 border-t border-zinc-800/50">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'list' | 'map')}
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

      {/* 탭 콘텐츠 */}
      {activeTab === 'list' && (
        <div className="flex-1 overflow-y-auto">
          {/* 검색 + 필터 */}
          <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row gap-4 w-full">
            <Input
              placeholder="국가명 또는 수도 검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 max-w-sm"
            />
            <div className="flex gap-2 flex-wrap">
              {regions.map(region => (
                <button
                  key={region}
                  onClick={() => setSelectedRegion(region)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    selectedRegion === region
                      ? 'bg-white text-zinc-950'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {region}
                </button>
              ))}
            </div>
          </div>

          {/* 국가 카드 목록 */}
          <div className="max-w-7xl mx-auto px-6 pb-12 w-full">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-zinc-900 rounded-xl h-52 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtered.map(country => (
                  <div
                    key={country.cca2}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-600 hover:scale-[1.02] transition-all duration-200 cursor-pointer group"
                  >
                    <div className="h-36 overflow-hidden bg-zinc-800">
                      <img
                        src={country.flags.svg}
                        alt={country.name.common}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-4">
                      <h2 className="font-semibold text-white truncate">{country.name.common}</h2>
                      <p className="text-zinc-500 text-xs mt-0.5 truncate">{country.name.official}</p>
                      <div className="mt-3 space-y-1">
                        <p className="text-zinc-400 text-xs">
                          🏙️ {country.capital?.[0] ?? '정보 없음'}
                        </p>
                        <p className="text-zinc-400 text-xs">
                          👥 {country.population.toLocaleString()}명
                        </p>
                        <p className="text-zinc-400 text-xs">
                          🌐 {country.region} {country.subregion ? `· ${country.subregion}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'map' && (
        <div className="flex-1 overflow-hidden">
          <WorldMap />
        </div>
      )}
    </main>
  )
}
