'use client'

import { useState, useEffect, memo } from 'react'
import { supabase } from '@/lib/supabase'

interface Stats {
  todayVisitors: number
  totalVisitors: number
  topCountries: Array<{ country: string; count: number }>
}

type Panel = 'collapsed' | 'login' | 'stats'

const glass = {
  position: 'absolute' as const,
  bottom: 80,
  zIndex: 1100,
  width: 280,
  background: 'rgba(9,9,18,0.90)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 16,
  padding: '18px 16px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  color: '#f1f5f9',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: '8px 10px',
  color: '#f1f5f9',
  fontSize: 13,
  outline: 'none',
}

const AdminPanel = memo(function AdminPanel({ right: rightProp = 20 }: { right?: number }) {
  const [panel, setPanel] = useState<Panel>('collapsed')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  // 기존 Supabase 세션 확인 (새로고침 후 자동 로그인)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        setAccessToken(session.access_token)
        loadStats(session.access_token)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadStats(token: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        setPanel('login')
        setAccessToken(null)
        return
      }
      const data: Stats = await res.json()
      setStats(data)
      setPanel('stats')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin() {
    setError(null)
    setLoading(true)
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
        return
      }
      const token = data.session?.access_token
      if (!token) {
        setError('로그인에 실패했습니다.')
        return
      }
      setAccessToken(token)
      await loadStats(token)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setPanel('collapsed')
    setStats(null)
    setAccessToken(null)
    setEmail('')
    setPassword('')
  }

  if (panel === 'collapsed') {
    return (
      <button
        onClick={() => setPanel('login')}
        title="관리자 통계"
        style={{
          position: 'absolute',
          bottom: 80,
          right: rightProp,
          zIndex: 1000,
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: 'rgba(15,15,25,0.65)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#475569',
          fontSize: 15,
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'right 0.35s cubic-bezier(0.4,0,0.2,1), border-color 0.2s, color 0.2s',
        }}
      >
        📊
      </button>
    )
  }

  if (panel === 'login') {
    return (
      <div style={{ ...glass, right: rightProp, transition: 'right 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em' }}>
            🔐 관리자 로그인
          </span>
          <button
            onClick={() => setPanel('collapsed')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 16, lineHeight: 1, padding: 0 }}
          >
            ×
          </button>
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
          onKeyDown={e => e.key === 'Enter' && !loading && handleLogin()}
          style={{ ...inputStyle, marginBottom: error ? 8 : 12 }}
        />

        {error && (
          <div style={{ fontSize: 11, color: '#f87171', marginBottom: 10 }}>{error}</div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '9px 0',
            borderRadius: 8,
            background: loading ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.09)',
            border: '1px solid rgba(255,255,255,0.13)',
            color: loading ? '#475569' : '#f1f5f9',
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </div>
    )
  }

  // stats panel
  return (
    <div style={{ ...glass, right: rightProp, maxHeight: '65vh', overflowY: 'auto', transition: 'right 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em' }}>
          📊 방문자 통계
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => accessToken && loadStats(accessToken)}
            title="새로고침"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 15, lineHeight: 1, padding: 0 }}
          >
            ↻
          </button>
          <button
            onClick={handleLogout}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 11, padding: 0 }}
          >
            로그아웃
          </button>
          <button
            onClick={() => setPanel('collapsed')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 16, lineHeight: 1, padding: 0 }}
          >
            ×
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#475569', fontSize: 13, padding: '20px 0' }}>
          로딩 중...
        </div>
      ) : stats ? (
        <>
          {/* 오늘 / 전체 접속자 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { label: '오늘 접속자', value: stats.todayVisitors },
              { label: '전체 접속자', value: stats.totalVisitors },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 10,
                  padding: '12px 8px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 700 }}>{value.toLocaleString()}</div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* 방문자 출신 국가 TOP 10 */}
          {stats.topCountries.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', marginBottom: 8, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                방문자 출신 국가 TOP {stats.topCountries.length}
              </div>
              {stats.topCountries.map(({ country, count }, i) => {
                const maxCount = stats.topCountries[0]?.count ?? 1
                const pct = Math.round((count / maxCount) * 100)
                return (
                  <div key={country} style={{ marginBottom: 7 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                      <span style={{ color: '#94a3b8' }}>
                        {i + 1}. {country === 'XX' ? '알 수 없음' : country}
                      </span>
                      <span style={{ color: '#64748b' }}>{count.toLocaleString()}</span>
                    </div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 99 }}>
                      <div
                        style={{
                          height: 3,
                          borderRadius: 99,
                          width: `${pct}%`,
                          background: 'rgba(148,163,184,0.45)',
                          transition: 'width 0.4s',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </>
      ) : null}
    </div>
  )
})

export default AdminPanel
