import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createHash } from 'crypto'
import { lookup as dnsLookup } from 'dns/promises'

export const runtime = 'nodejs'

const MAX_BUSINESS_NAME = 60
const MAX_DESCRIPTION = 100
const RATE_WINDOW_MS = 24 * 60 * 60 * 1000
const MAX_PINS_PER_DAY = 3
const DISABLE_RATE_LIMIT = process.env.DISABLE_PIN_RATE_LIMIT === 'true'

function hashIp(ip: string): string {
  return createHash('sha256').update(ip + (process.env.IP_SALT ?? 'salt')).digest('hex').slice(0, 16)
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url.trim())
    // 스키마+호스트 소문자, 경로 끝 슬래시 제거, 검색파라미터·해시 제거
    return (parsed.protocol + '//' + parsed.host + parsed.pathname).replace(/\/+$/, '')
  } catch {
    return url.trim()
  }
}

// 단축 URL 서비스 차단 (안전 검증 우회 방지)
const BLOCKED_DOMAINS = ['bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'short.link']
function isBlockedDomain(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return BLOCKED_DOMAINS.some(d => host === d || host.endsWith('.' + d))
  } catch {
    return false
  }
}

// 도메인 실존 확인 (DNS 조회 방식)
// HTTP HEAD 대신 DNS lookup 사용 이유:
//   - 한국 사이트(naver 등)를 포함한 많은 서버가 봇 HTTP 요청을 차단
//   - DNS 성공 = 도메인 실존, DNS NXDOMAIN = 존재하지 않는 도메인
async function checkDomainExists(url: string): Promise<boolean> {
  try {
    const { hostname } = new URL(url)
    if (!hostname) return false
    await dnsLookup(hostname)
    return true
  } catch {
    return false  // DNS 조회 실패 = 도메인 없음 (ENOTFOUND 등)
  }
}

// Google Safe Browsing API v4 — 악성/피싱 사이트 검사
// API 키 미설정 시 패스 (선택적 기능)
async function checkSafeBrowsing(url: string): Promise<boolean> {
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY
  if (!apiKey) return true
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 3000)
  try {
    const res = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          client: { clientId: 'worldstats', clientVersion: '1.0' },
          threatInfo: {
            threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: [{ url }],
          },
        }),
      }
    )
    const data = await res.json()
    return !(data.matches && data.matches.length > 0)  // true = 안전
  } catch {
    return true  // 오류 시 허용 (서비스 중단 방지)
  } finally {
    clearTimeout(timer)
  }
}

function isTrustedLogoUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname
    return parsed.hostname === supabaseHost
  } catch {
    return false
  }
}

const SELECT_FIELDS = 'id, country_alpha2, business_name, description, logo_url, website_url, tier, created_at, expires_at'

// GET /api/pins?country=KR  또는  GET /api/pins?all=1
export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get('country')
  const all = req.nextUrl.searchParams.get('all')

  const now = new Date().toISOString()

  if (all === '1') {
    const { data, error } = await supabase
      .from('globe_pins')
      .select(SELECT_FIELDS)
      .eq('is_approved', true)
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data ?? [])
  }

  if (!country) return Response.json({ error: 'country or all=1 required' }, { status: 400 })

  const { data, error } = await supabase
    .from('globe_pins')
    .select(SELECT_FIELDS)
    .eq('country_alpha2', country)
    .eq('is_approved', true)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}

// POST /api/pins  { country_alpha2, business_name, description?, logo_url?, website_url? }
export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const ipHash = hashIp(ip)
  const body = await req.json()
  const { country_alpha2, business_name, description, logo_url, website_url } = body

  if (!country_alpha2 || !business_name?.trim()) {
    return Response.json({ error: '필수 항목 누락 (country_alpha2, business_name)' }, { status: 400 })
  }
  if (business_name.trim().length > MAX_BUSINESS_NAME) {
    return Response.json({ error: `사업명은 최대 ${MAX_BUSINESS_NAME}자` }, { status: 400 })
  }
  if (description && description.trim().length > MAX_DESCRIPTION) {
    return Response.json({ error: `소개는 최대 ${MAX_DESCRIPTION}자` }, { status: 400 })
  }
  if (website_url && !isValidUrl(website_url)) {
    return Response.json({ error: 'URL 형식이 올바르지 않아요 (http:// 또는 https://)' }, { status: 400 })
  }

  // logo_url은 반드시 자체 Supabase Storage에서 업로드된 것만 허용
  if (logo_url && !isTrustedLogoUrl(logo_url)) {
    return Response.json({ error: '허용되지 않은 이미지 URL이에요' }, { status: 400 })
  }

  // website_url 정규화 (trailing slash 제거, 쿼리/해시 제거, 소문자 scheme+host)
  const normalizedWebsiteUrl = website_url ? normalizeUrl(website_url) : null

  // website_url 단축 URL 차단 + 도메인 실존 + Safe Browsing 병렬 검증
  if (normalizedWebsiteUrl) {
    if (isBlockedDomain(normalizedWebsiteUrl)) {
      return Response.json({ code: 'shorturl_blocked' }, { status: 422 })
    }
    const [exists, isSafe] = await Promise.all([
      checkDomainExists(normalizedWebsiteUrl),
      checkSafeBrowsing(normalizedWebsiteUrl),
    ])
    if (!exists) {
      return Response.json({ code: 'domain_unreachable' }, { status: 422 })
    }
    if (!isSafe) {
      return Response.json({ code: 'malicious_url' }, { status: 422 })
    }
  }

  // website_url 전역 중복 방지 (만료되지 않은 핀 기준, 정규화된 값으로 비교)
  if (normalizedWebsiteUrl) {
    const nowStr = new Date().toISOString()
    const { count: urlCount } = await supabase
      .from('globe_pins')
      .select('id', { count: 'exact', head: true })
      .eq('website_url', normalizedWebsiteUrl)
      .gt('expires_at', nowStr)

    if ((urlCount ?? 0) > 0) {
      return Response.json({ code: 'url_duplicate' }, { status: 409 })
    }
  }

  // 하루 MAX_PINS_PER_DAY개 제한
  if (!DISABLE_RATE_LIMIT) {
    const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString()
    const { count } = await supabase
      .from('globe_pins')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', since)

    if ((count ?? 0) >= MAX_PINS_PER_DAY) {
      return Response.json({ code: 'rate_limit' }, { status: 429 })
    }
  }

  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('globe_pins')
    .insert({
      country_alpha2,
      business_name: business_name.trim(),
      description: description?.trim() || null,
      logo_url: logo_url || null,
      website_url: normalizedWebsiteUrl || null,
      ip_hash: ipHash,
      expires_at: expiresAt,
    })
    .select(SELECT_FIELDS)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
