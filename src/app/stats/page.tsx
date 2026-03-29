'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import isoCountries from 'i18n-iso-countries'
import localeKo from 'i18n-iso-countries/langs/ko.json'

isoCountries.registerLocale(localeKo)

const IS_PUBLIC = process.env.NEXT_PUBLIC_STATS_PUBLIC === 'true'

interface CountryRow {
  country: string
  count: number
}

interface Stats {
  todayVisitors: number
  totalVisitors: number
  countries: CountryRow[]
}

/** ISO alpha-2 → 국기 이모지 */
function flagEmoji(code: string): string {
  if (code === 'XX') return '🌐'
  return [...code.toUpperCase()]
    .map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('')
}

function countryName(code: string): string {
  if (code === 'XX') return '알 수 없음'
  return isoCountries.getName(code, 'ko') ?? code
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: '10px 12px',
  color: '#f1f5f9',
  fontSize: 14,
  outline: 'none',
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 비공개 모드 로그인 상태
  const [authed, setAuthed] = useState(IS_PUBLIC)
  const [token, setToken] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)

  // 기존 세션 복원
  useEffect(() => {
    if (IS_PUBLIC) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        setToken(session.access_token)
        setAuthed(true)
      }
    })
  }, [])

  // 인증 후 데이터 로드
  useEffect(() => {
    if (!authed) return
    setLoading(true)
    setError(null)
    const headers: Record<string, string> = {}
    if (!IS_PUBLIC && token) headers['Authorization'] = `Bearer ${token}`

    fetch('/api/stats', { headers })
      .then(async res => {
        if (!res.ok) throw new Error('데이터를 불러오지 못했습니다.')
        return res.json()
      })
      .then((data: Stats) => setStats(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [authed, token])

  async function handleLogin() {
    setLoginError(null)
    setLoginLoading(true)
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setLoginError('이메일 또는 비밀번호가 올바르지 않습니다.')
        return
      }
      const t = data.session?.access_token
      if (!t) { setLoginError('로그인에 실패했습니다.'); return }
      setToken(t)
      setAuthed(true)
    } finally {
      setLoginLoading(false)
    }
  }

  // 로그인 폼 (비공개 모드)
  if (!authed) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center px-4">
        <div style={{
          width: '100%', maxWidth: 360,
          background: 'rgba(9,9,18,0.90)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: '32px 24px',
        }}>
          <div className="mb-6 text-center">
            <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">← WorldStats</Link>
            <h1 className="text-lg font-bold mt-3">📊 방문자 통계</h1>
            <p className="text-xs text-zinc-500 mt-1">관리자 로그인이 필요합니다</p>
          </div>

          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ ...inputStyle, marginBottom: 8 }}
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loginLoading && handleLogin()}
            style={{ ...inputStyle, marginBottom: loginError ? 8 : 16 }}
          />
          {loginError && <p className="text-xs text-red-400 mb-4">{loginError}</p>}

          <button
            onClick={handleLogin}
            disabled={loginLoading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors"
            style={{
              background: loginLoading ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.09)',
              border: '1px solid rgba(255,255,255,0.13)',
              color: loginLoading ? '#475569' : '#f1f5f9',
              cursor: loginLoading ? 'wait' : 'pointer',
            }}
          >
            {loginLoading ? '로그인 중...' : '로그인'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur shrink-0">
        <div className="max-w-2xl mx-auto px-6 flex items-center h-12 gap-4">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">← WorldStats</Link>
          <span className="text-sm font-bold">📊 방문자 출신 국가 통계</span>
          {!IS_PUBLIC && (
            <button
              onClick={async () => { await supabase.auth.signOut(); setAuthed(false); setToken(null); setStats(null) }}
              className="ml-auto text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              로그아웃
            </button>
          )}
        </div>
      </div>

      {/* 본문 — 내부 스크롤 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-6">
          {loading && (
            <div className="text-center text-zinc-500 py-20 text-sm">로딩 중...</div>
          )}
          {error && (
            <div className="text-center text-red-400 py-20 text-sm">{error}</div>
          )}

          {stats && (
            <>
              {/* 요약 카드 */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { label: '오늘 방문자', value: stats.todayVisitors },
                  { label: '전체 방문자', value: stats.totalVisitors },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center">
                    <div className="text-3xl font-bold tabular-nums">{value.toLocaleString()}</div>
                    <div className="text-xs text-zinc-500 mt-1">{label}</div>
                  </div>
                ))}
              </div>

              {/* 국가 테이블 */}
              <div className="rounded-xl border border-zinc-800 overflow-hidden">
                <div className="grid grid-cols-[40px_1fr_90px_60px] gap-2 px-4 py-2.5 text-xs text-zinc-500 border-b border-zinc-800 font-medium uppercase tracking-wide">
                  <span>#</span>
                  <span>국가</span>
                  <span className="text-right">방문자</span>
                  <span className="text-right">비율</span>
                </div>

                {stats.countries.map(({ country, count }, i) => {
                  const total = stats.totalVisitors || 1
                  const pct = ((count / total) * 100).toFixed(1)
                  const barPct = Math.round((count / (stats.countries[0]?.count || 1)) * 100)
                  return (
                    <div key={country} className="border-b border-zinc-800/50 last:border-none px-4 py-3">
                      <div className="grid grid-cols-[40px_1fr_90px_60px] gap-2 items-center">
                        <span className="text-xs text-zinc-600 tabular-nums">{i + 1}</span>
                        <span className="text-sm">
                          {flagEmoji(country)}&nbsp;&nbsp;{countryName(country)}
                        </span>
                        <span className="text-sm text-right tabular-nums">{count.toLocaleString()}</span>
                        <span className="text-xs text-zinc-500 text-right tabular-nums">{pct}%</span>
                      </div>
                      <div className="mt-1.5 h-1 bg-zinc-800 rounded-full ml-10">
                        <div
                          className="h-1 rounded-full bg-zinc-500 transition-all duration-500"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}

                {stats.countries.length === 0 && (
                  <div className="text-center text-zinc-600 text-sm py-12">아직 데이터가 없습니다</div>
                )}
              </div>

              <p className="text-xs text-zinc-700 text-center mt-4 pb-4">
                방문자 IP 기반 추정 · 30분 쿨다운 적용
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
