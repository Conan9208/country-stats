'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Globe, BarChart2, MessageCircle, Pin, RefreshCw, LogOut, Trash2, X } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Stats {
  todayVisitors: number
  totalVisitors: number
  topCountries: Array<{ country: string; count: number }>
}

interface ReportedComment {
  id: number
  country_code: string
  content: string
  report_count: number
  is_hidden: boolean
  created_at: string
}

interface ReportedPin {
  id: string
  country_alpha2: string
  business_name: string
  description: string
  website_url: string
  report_count: number
  is_approved: boolean
  expires_at: string
  created_at: string
}

type Tab = 'stats' | 'comments' | 'pins'

// ─── Styles ──────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  padding: '14px 16px',
}

const btn = (variant: 'danger' | 'muted'): React.CSSProperties => ({
  background: variant === 'danger' ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.06)',
  border: `1px solid ${variant === 'danger' ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.1)'}`,
  borderRadius: 7,
  color: variant === 'danger' ? '#f87171' : '#94a3b8',
  fontSize: 12,
  fontWeight: 600,
  padding: '5px 12px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
})

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)

  const [tab, setTab] = useState<Tab>('stats')
  const [stats, setStats] = useState<Stats | null>(null)
  const [comments, setComments] = useState<ReportedComment[]>([])
  const [pins, setPins] = useState<ReportedPin[]>([])
  const [loading, setLoading] = useState(false)

  // 자동 세션 복구
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) setAccessToken(session.access_token)
    })
  }, [])

  // ── 데이터 로드 ──────────────────────────────────────────────────────────

  const loadStats = useCallback(async (token: string) => {
    const res = await fetch('/api/admin/stats', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    setStats(await res.json())
  }, [])

  const loadComments = useCallback(async (token: string) => {
    const res = await fetch('/api/admin/reports?type=comments', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const json = await res.json()
    setComments(json.data ?? [])
  }, [])

  const loadPins = useCallback(async (token: string) => {
    const res = await fetch('/api/admin/reports?type=pins', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const json = await res.json()
    setPins(json.data ?? [])
  }, [])

  const loadTab = useCallback(async (t: Tab, token: string) => {
    setLoading(true)
    try {
      if (t === 'stats') await loadStats(token)
      if (t === 'comments') await loadComments(token)
      if (t === 'pins') await loadPins(token)
    } finally {
      setLoading(false)
    }
  }, [loadStats, loadComments, loadPins])

  // 탭 변경 시 해당 데이터 로드
  useEffect(() => {
    if (accessToken) loadTab(tab, accessToken)
  }, [tab, accessToken, loadTab])

  // ── 로그인 ────────────────────────────────────────────────────────────────

  async function handleLogin() {
    setLoginError(null)
    setLoginLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setLoginError('이메일 또는 비밀번호가 올바르지 않습니다.'); return }
      const token = data.session?.access_token
      if (!token) { setLoginError('로그인에 실패했습니다.'); return }
      setAccessToken(token)
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setAccessToken(null)
    setStats(null)
    setComments([])
    setPins([])
  }

  // ── 댓글 조치 ────────────────────────────────────────────────────────────

  async function deleteComment(id: number) {
    if (!accessToken) return
    await fetch(`/api/admin/comments/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    setComments(prev => prev.filter(c => c.id !== id))
  }

  async function dismissComment(id: number) {
    if (!accessToken) return
    await fetch(`/api/admin/comments/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss' }),
    })
    setComments(prev => prev.filter(c => c.id !== id))
  }

  // ── 핀 조치 ──────────────────────────────────────────────────────────────

  async function deletePin(id: string) {
    if (!accessToken) return
    await fetch(`/api/admin/pins/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    setPins(prev => prev.filter(p => p.id !== id))
  }

  async function dismissPin(id: string) {
    if (!accessToken) return
    await fetch(`/api/admin/pins/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss' }),
    })
    setPins(prev => prev.filter(p => p.id !== id))
  }

  // ── 렌더 ─────────────────────────────────────────────────────────────────

  // 로그인 화면
  if (!accessToken) {
    return (
      <div style={{ minHeight: '100vh', background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 320, ...card, padding: '28px 24px' }}>
          <div style={{ marginBottom: 20 }}>
            <Link href="/" style={{ fontSize: 12, color: '#475569', textDecoration: 'none' }}>← 홈으로</Link>
            <div style={{ marginTop: 12, fontSize: 18, fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Globe size={18} /> WorldStats 관리자
            </div>
          </div>

          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', color: '#f1f5f9', fontSize: 13, outline: 'none', marginBottom: 8 }}
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loginLoading && handleLogin()}
            style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', color: '#f1f5f9', fontSize: 13, outline: 'none', marginBottom: loginError ? 8 : 14 }}
          />

          {loginError && <div style={{ fontSize: 11, color: '#f87171', marginBottom: 10 }}>{loginError}</div>}

          <button
            onClick={handleLogin}
            disabled={loginLoading}
            style={{ width: '100%', padding: '10px 0', borderRadius: 8, background: loginLoading ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.13)', color: loginLoading ? '#475569' : '#f1f5f9', fontSize: 13, fontWeight: 600, cursor: loginLoading ? 'wait' : 'pointer' }}
          >
            {loginLoading ? '로그인 중...' : '로그인'}
          </button>
        </div>
      </div>
    )
  }

  // 대시보드
  const tabItems: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'stats', label: '방문자 통계', icon: <BarChart2 size={14} /> },
    { id: 'comments', label: '댓글 신고', icon: <MessageCircle size={14} />, badge: comments.length },
    { id: 'pins', label: '핀 신고', icon: <Pin size={14} />, badge: pins.length },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#f1f5f9', padding: '32px 24px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Globe size={20} />
            <span style={{ fontSize: 18, fontWeight: 700 }}>WorldStats 관리자</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => loadTab(tab, accessToken)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}
            >
              <RefreshCw size={14} /> 새로고침
            </button>
            <button
              onClick={handleLogout}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}
            >
              <LogOut size={14} /> 로그아웃
            </button>
          </div>
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 0 }}>
          {tabItems.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 16px', fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
                color: tab === t.id ? '#f1f5f9' : '#64748b',
                borderBottom: tab === t.id ? '2px solid #a78bfa' : '2px solid transparent',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'color 0.15s',
              }}
            >
              {t.icon} {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 로딩 */}
        {loading && (
          <div style={{ textAlign: 'center', color: '#475569', padding: '40px 0' }}>로딩 중...</div>
        )}

        {/* ── 방문자 통계 탭 ── */}
        {!loading && tab === 'stats' && stats && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              {[
                { label: '오늘 접속자', value: stats.todayVisitors },
                { label: '전체 접속자', value: stats.totalVisitors },
              ].map(({ label, value }) => (
                <div key={label} style={{ ...card, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{value.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>

            {stats.topCountries.length > 0 && (
              <div style={card}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 12, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                  방문자 출신 국가 TOP {stats.topCountries.length}
                </div>
                {stats.topCountries.map(({ country, count }, i) => {
                  const maxCount = stats.topCountries[0]?.count ?? 1
                  const pct = Math.round((count / maxCount) * 100)
                  return (
                    <div key={country} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span style={{ color: '#94a3b8' }}>{i + 1}. {country === 'XX' ? '알 수 없음' : country}</span>
                        <span style={{ color: '#64748b' }}>{count.toLocaleString()}</span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 99 }}>
                        <div style={{ height: 4, borderRadius: 99, width: `${pct}%`, background: 'rgba(148,163,184,0.45)', transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 댓글 신고 탭 ── */}
        {!loading && tab === 'comments' && (
          <div>
            {comments.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#475569', padding: '40px 0', fontSize: 14 }}>
                신고된 댓글이 없습니다.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {comments.map(c => (
                  <div key={c.id} style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', background: 'rgba(255,255,255,0.06)', borderRadius: 5, padding: '2px 7px' }}>
                            {c.country_code}
                          </span>
                          <span style={{ fontSize: 11, color: '#f87171', fontWeight: 700 }}>
                            🚨 신고 {c.report_count}회
                          </span>
                          {c.is_hidden && (
                            <span style={{ fontSize: 10, color: '#64748b', background: 'rgba(255,255,255,0.04)', borderRadius: 4, padding: '1px 6px' }}>
                              숨김
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.5, wordBreak: 'break-word' }}>
                          {c.content}
                        </div>
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>
                          {new Date(c.created_at).toLocaleString('ko-KR')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                        <button style={btn('danger')} onClick={() => deleteComment(c.id)}>
                          <Trash2 size={11} /> 삭제
                        </button>
                        <button style={btn('muted')} onClick={() => dismissComment(c.id)}>
                          <X size={11} /> 무시
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 핀 신고 탭 ── */}
        {!loading && tab === 'pins' && (
          <div>
            {pins.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#475569', padding: '40px 0', fontSize: 14 }}>
                신고된 핀이 없습니다.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pins.map(p => (
                  <div key={p.id} style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', background: 'rgba(255,255,255,0.06)', borderRadius: 5, padding: '2px 7px' }}>
                            {p.country_alpha2}
                          </span>
                          <span style={{ fontSize: 11, color: '#f87171', fontWeight: 700 }}>
                            🚨 신고 {p.report_count}회
                          </span>
                          {!p.is_approved && (
                            <span style={{ fontSize: 10, color: '#64748b', background: 'rgba(255,255,255,0.04)', borderRadius: 4, padding: '1px 6px' }}>
                              숨김
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>
                          {p.business_name}
                        </div>
                        {p.description && (
                          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{p.description}</div>
                        )}
                        {p.website_url && (
                          <a
                            href={p.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 11, color: '#a78bfa', textDecoration: 'none' }}
                          >
                            {p.website_url}
                          </a>
                        )}
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>
                          만료: {p.expires_at ? new Date(p.expires_at).toLocaleString('ko-KR') : '-'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                        <button style={btn('danger')} onClick={() => deletePin(p.id)}>
                          <Trash2 size={11} /> 삭제
                        </button>
                        <button style={btn('muted')} onClick={() => dismissPin(p.id)}>
                          <X size={11} /> 무시
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
