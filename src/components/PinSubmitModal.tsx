'use client'

import { useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { glass } from '@/lib/mapConstants'
import { useTranslations } from 'next-intl'

const MAX_BUSINESS_NAME = 60
const MAX_DESCRIPTION = 100
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

type Props = {
  countryName: string
  countryAlpha2: string
  onClose: () => void
  onSuccess: (shareText: string) => void
}

export default function PinSubmitModal({ countryName, countryAlpha2, onClose, onSuccess }: Props) {
  const t = useTranslations('Pin')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [businessName, setBusinessName] = useState('')
  const [description, setDescription] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'submitting' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMsg(t('fileTypeError'))
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setErrorMsg(t('fileSizeError'))
      return
    }
    setErrorMsg('')
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = () => setLogoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  function removeLogo() {
    setLogoFile(null)
    setLogoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function uploadLogo(file: File): Promise<string | null> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) return null

    const client = createClient(supabaseUrl, supabaseAnonKey)
    const ext = file.name.split('.').pop() ?? 'png'
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error } = await client.storage.from('logos').upload(path, file, { upsert: false })
    if (error) return null

    const { data } = client.storage.from('logos').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSubmit() {
    if (!businessName.trim()) return
    setStatus('uploading')
    setErrorMsg('')

    let logoUrl: string | null = null
    if (logoFile) {
      logoUrl = await uploadLogo(logoFile)
      if (!logoUrl) {
        setErrorMsg(t('uploadError'))
        setStatus('error')
        return
      }
    }

    setStatus('submitting')

    const res = await fetch('/api/pins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        country_alpha2: countryAlpha2,
        business_name: businessName.trim(),
        description: description.trim() || undefined,
        logo_url: logoUrl,
        website_url: websiteUrl.trim() || undefined,
      }),
    })

    if (res.status === 429) {
      setErrorMsg(t('rateLimitError'))
      setStatus('error')
      return
    }
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setErrorMsg(json.error ?? t('genericError'))
      setStatus('error')
      return
    }

    setStatus('done')
    onSuccess(t('shareText', { country: countryName }))
  }

  const isLoading = status === 'uploading' || status === 'submitting'
  const canSubmit = businessName.trim().length > 0 && !isLoading

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ ...glass, borderRadius: 16, padding: 24, width: 360, maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>{t('title')}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{countryName}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>

        {status !== 'done' ? (
          <>
            {/* 로고 업로드 */}
            <div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, fontWeight: 600, letterSpacing: '0.05em' }}>{t('logoLabel')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* 원형 미리보기 */}
                <div
                  onClick={() => !logoPreview && fileInputRef.current?.click()}
                  style={{
                    width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                    background: logoPreview ? 'transparent' : 'rgba(255,255,255,0.06)',
                    border: '2px dashed rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: logoPreview ? 'default' : 'pointer',
                    overflow: 'hidden', position: 'relative',
                  }}
                >
                  {logoPreview
                    ? <img src={logoPreview} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 20 }}>🏢</span>
                  }
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {!logoPreview ? (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 8, color: '#94a3b8', fontSize: 12, padding: '7px 12px',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      {t('logoUploadBtn')}
                    </button>
                  ) : (
                    <button
                      onClick={removeLogo}
                      style={{
                        background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)',
                        borderRadius: 8, color: '#f87171', fontSize: 12, padding: '7px 12px',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      {t('logoRemoveBtn')}
                    </button>
                  )}
                  <span style={{ fontSize: 10, color: '#334155' }}>{t('logoHint')}</span>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>

            {/* 사업명 */}
            <div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' }}>
                {t('businessNameLabel')} <span style={{ color: '#f87171' }}>*</span>
              </div>
              <input
                type="text"
                value={businessName}
                onChange={e => setBusinessName(e.target.value.slice(0, MAX_BUSINESS_NAME))}
                placeholder={t('businessNamePlaceholder')}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, color: '#e2e8f0', fontSize: 13,
                  padding: '10px 12px', outline: 'none', fontFamily: 'inherit',
                }}
              />
              <div style={{ fontSize: 10, color: businessName.length >= MAX_BUSINESS_NAME ? '#f87171' : '#475569', textAlign: 'right', marginTop: 2 }}>
                {businessName.length} / {MAX_BUSINESS_NAME}
              </div>
            </div>

            {/* 한 줄 소개 */}
            <div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' }}>{t('descriptionLabel')}</div>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
                placeholder={t('descriptionPlaceholder')}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, color: '#e2e8f0', fontSize: 13,
                  padding: '10px 12px', outline: 'none', fontFamily: 'inherit',
                }}
              />
              <div style={{ fontSize: 10, color: description.length >= MAX_DESCRIPTION ? '#f87171' : '#475569', textAlign: 'right', marginTop: 2 }}>
                {description.length} / {MAX_DESCRIPTION}
              </div>
            </div>

            {/* 웹사이트 URL */}
            <div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' }}>{t('websiteLabel')}</div>
              <input
                type="url"
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                placeholder="https://yoursite.com"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, color: '#e2e8f0', fontSize: 13,
                  padding: '10px 12px', outline: 'none', fontFamily: 'inherit',
                }}
              />
            </div>

            {/* 에러 */}
            {(status === 'error') && errorMsg && (
              <div style={{ fontSize: 12, color: '#f87171', background: 'rgba(248,113,113,0.1)', borderRadius: 8, padding: '8px 12px' }}>
                {errorMsg}
              </div>
            )}

            {/* 안내 */}
            <div style={{ fontSize: 11, color: '#334155', background: 'rgba(167,139,250,0.06)', borderRadius: 8, padding: '8px 12px' }}>
              {t('notice3days')}
            </div>

            {/* 등록 버튼 */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                background: canSubmit ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${canSubmit ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 10, color: canSubmit ? '#a78bfa' : '#334155',
                fontSize: 14, fontWeight: 600, padding: '10px 0',
                cursor: canSubmit ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
              }}
            >
              {status === 'uploading' ? t('uploading')
                : status === 'submitting' ? t('submitting')
                : t('submit')}
            </button>
          </>
        ) : (
          /* 성공 화면 */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', padding: '8px 0' }}>
            {logoPreview
              ? <img src={logoPreview} alt="logo" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
              : <div style={{ fontSize: 40 }}>🌍</div>
            }
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', textAlign: 'center' }}>{t('successTitle')}</div>
            <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>{t('successDesc', { country: countryName })}</div>
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <button
                onClick={() => {
                  const text = t('shareText', { country: countryName })
                  const url = typeof window !== 'undefined' ? window.location.href : ''
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text + '\n' + url)}`, '_blank')
                }}
                style={{ flex: 1, background: 'rgba(29,161,242,0.15)', border: '1px solid rgba(29,161,242,0.3)', borderRadius: 10, color: '#7dd3fc', fontSize: 13, fontWeight: 600, padding: '9px 0', cursor: 'pointer' }}
              >
                𝕏 {t('shareBtn')}
              </button>
              <button
                onClick={onClose}
                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#94a3b8', fontSize: 13, fontWeight: 600, padding: '9px 0', cursor: 'pointer' }}
              >
                {t('close')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
