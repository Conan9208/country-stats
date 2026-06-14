// ─── 오프라인 국가 데이터 레이어 ──────────────────────────────────────────────
//
// restcountries.com/v3.1 API 가 legacy 덤프로 리디렉션되며 사실상 다운된 이후,
// travel/country 페이지가 외부 API 에 의존해 404(notFound) 또는 thin 페이지를
// 내던 문제를 해결하기 위해 도입한 번들 데이터 소스.
//
//   - world-countries  : 이름/통화/수도/지역/언어/면적/국경/국제전화 등 정적 데이터
//   - tz-lookup        : latlng → IANA 시간대 (250/250 커버)
//   - i18n-iso-countries : 한국어 국가명
//   - COUNTRY_POPULATION : World Bank 기준 인구 스냅샷 (번들)
//   - flagcdn.com      : 국기 SVG (정적 CDN)
//
// 모든 데이터가 동기/오프라인이라 외부 API 장애와 무관하게 항상 렌더된다.

import worldCountries from 'world-countries'
import tzlookup from 'tz-lookup'
import isoCountries from 'i18n-iso-countries'
import localeKo from 'i18n-iso-countries/langs/ko.json'
import localeEn from 'i18n-iso-countries/langs/en.json'
import { COUNTRY_POPULATION } from '@/data/countryPopulation'
import type { CountryBasic } from '@/types/travel'

isoCountries.registerLocale(localeKo)
isoCountries.registerLocale(localeEn)

// ─── 좌측통행 국가 (ISO alpha-2) ──────────────────────────────────────────────
const LEFT_DRIVING = new Set<string>([
  'AG', 'AI', 'AU', 'BB', 'BD', 'BM', 'BN', 'BS', 'BT', 'BW', 'CY', 'DM', 'FJ',
  'FK', 'GB', 'GD', 'GG', 'GY', 'HK', 'ID', 'IE', 'IM', 'IN', 'JE', 'JM', 'JP',
  'KE', 'KI', 'KN', 'KY', 'LC', 'LK', 'LS', 'MO', 'MS', 'MT', 'MU', 'MV', 'MW',
  'MY', 'MZ', 'NA', 'NF', 'NP', 'NR', 'NU', 'NZ', 'PG', 'PK', 'PN', 'SB', 'SC',
  'SG', 'SH', 'SR', 'SZ', 'TC', 'TH', 'TL', 'TO', 'TT', 'TV', 'TZ', 'UG', 'VC',
  'VG', 'WS', 'ZA', 'ZM', 'ZW',
])

type WCEntry = (typeof worldCountries)[number]

const BY_CCA2 = new Map<string, WCEntry>()
for (const c of worldCountries) BY_CCA2.set(c.cca2.toUpperCase(), c)

export interface CountryFull {
  cca2: string
  cca3: string
  nameEn: string
  nameKo: string
  capital: string | null
  region: string | null
  subregion: string | null
  languages: Record<string, string> | null
  currency: { code: string; name: string; symbol: string } | null
  timezones: string[]
  population: number | null
  area: number | null
  landlocked: boolean | null
  borders: string[] | null
  unMember: boolean | null
  demonym: string | null
  tld: string[] | null
  independent: boolean | null
  iddRoot: string | null
  iddSuffixes: string[] | null
  drivingSide: 'left' | 'right'
  flag: string
  latlng: [number, number] | null
}

/** 동기 오프라인 조회. 유효한 ISO alpha-2 가 아니면 null. */
export function getCountryFull(code: string): CountryFull | null {
  const cc = code.toUpperCase()
  const c = BY_CCA2.get(cc)
  if (!c) return null

  const latlng: [number, number] | null =
    Array.isArray(c.latlng) && c.latlng.length === 2
      ? [c.latlng[0], c.latlng[1]]
      : null

  let tz = 'UTC'
  if (latlng) {
    try {
      tz = tzlookup(latlng[0], latlng[1])
    } catch {
      tz = 'UTC'
    }
  }

  const [curCode, curMeta] = Object.entries(c.currencies ?? {})[0] ?? []

  return {
    cca2: cc,
    cca3: c.cca3,
    nameEn: c.name.common,
    nameKo: isoCountries.getName(cc, 'ko') ?? c.name.common,
    capital: c.capital?.[0] ?? null,
    region: c.region || null,
    subregion: c.subregion || null,
    languages: c.languages ?? null,
    currency: curCode
      ? { code: curCode, name: curMeta?.name ?? curCode, symbol: curMeta?.symbol ?? curCode }
      : null,
    timezones: [tz],
    population: COUNTRY_POPULATION[cc] ?? null,
    area: typeof c.area === 'number' && c.area > 0 ? c.area : null,
    landlocked: typeof c.landlocked === 'boolean' ? c.landlocked : null,
    borders: Array.isArray(c.borders) && c.borders.length > 0 ? c.borders : null,
    unMember: typeof c.unMember === 'boolean' ? c.unMember : null,
    demonym: c.demonyms?.eng?.m ?? c.demonyms?.eng?.f ?? null,
    tld: Array.isArray(c.tld) && c.tld.length > 0 ? c.tld : null,
    independent: typeof c.independent === 'boolean' ? c.independent : null,
    iddRoot: c.idd?.root || null,
    iddSuffixes: Array.isArray(c.idd?.suffixes) && c.idd.suffixes.length > 0 ? c.idd.suffixes : null,
    drivingSide: LEFT_DRIVING.has(cc) ? 'left' : 'right',
    flag: `https://flagcdn.com/${cc.toLowerCase()}.svg`,
    latlng,
  }
}

// ─── restcountries v3.1 호환 shape ────────────────────────────────────────────
// 클라이언트 컴포넌트(환율계산기·국가정보 모달·퀴즈·스핀·여행 검색)가 기존에
// restcountries.com/v3.1 응답을 그대로 파싱하므로, 같은 형태로 내주는
// /api/countries 엔드포인트용 변환기. URL 만 바꾸면 파싱 코드는 그대로 동작한다.

export interface RestCountry {
  cca2: string
  name: { common: string }
  flags: { svg: string; png: string }
  capital: string[]
  population: number
  area: number
  region: string
  subregion: string
  languages: Record<string, string>
  currencies: Record<string, { name: string; symbol: string }>
  timezones: string[]
  idd: { root: string; suffixes: string[] }
  tld: string[]
  car: { side: 'left' | 'right' }
  borders: string[]
  landlocked: boolean
}

function toRest(c: WCEntry): RestCountry {
  const cc = c.cca2.toUpperCase()
  let tz = 'UTC'
  if (Array.isArray(c.latlng) && c.latlng.length === 2) {
    try {
      tz = tzlookup(c.latlng[0], c.latlng[1])
    } catch {
      tz = 'UTC'
    }
  }
  const lower = c.cca2.toLowerCase()
  return {
    cca2: c.cca2,
    name: { common: c.name.common },
    flags: { svg: `https://flagcdn.com/${lower}.svg`, png: `https://flagcdn.com/w320/${lower}.png` },
    capital: Array.isArray(c.capital) ? c.capital : [],
    population: COUNTRY_POPULATION[cc] ?? 0,
    area: typeof c.area === 'number' && c.area > 0 ? c.area : 0,
    region: c.region ?? '',
    subregion: c.subregion ?? '',
    languages: c.languages ?? {},
    currencies: c.currencies ?? {},
    timezones: [tz],
    idd: c.idd ?? { root: '', suffixes: [] },
    tld: Array.isArray(c.tld) ? c.tld : [],
    car: { side: LEFT_DRIVING.has(cc) ? 'left' : 'right' },
    borders: Array.isArray(c.borders) ? c.borders : [],
    landlocked: typeof c.landlocked === 'boolean' ? c.landlocked : false,
  }
}

let _allRest: RestCountry[] | null = null

/** 전체 국가를 restcountries /all 호환 배열로 반환 (모듈 캐시). */
export function getAllRestCountries(): RestCountry[] {
  if (!_allRest) _allRest = worldCountries.map(toRest)
  return _allRest
}

/** 단일 국가를 restcountries /alpha 호환 객체로 반환. 없으면 null. */
export function getRestCountry(code: string): RestCountry | null {
  const c = BY_CCA2.get(code.toUpperCase())
  return c ? toRest(c) : null
}

/** travel 페이지용 CountryBasic 형태로 반환. 유효 ISO 가 아니면 null. */
export function getCountryBasic(code: string, isKo: boolean): CountryBasic | null {
  const f = getCountryFull(code)
  if (!f) return null
  return {
    cca2: f.cca2,
    name: isKo ? f.nameKo : f.nameEn,
    flag: f.flag,
    capital: f.capital ?? '-',
    population: f.population ?? 0,
    area: f.area ?? 0,
    region: f.region ?? '',
    languages: Object.values(f.languages ?? {}).slice(0, 2),
    currency: f.currency ?? { code: 'USD', name: 'US Dollar', symbol: '$' },
    timezones: f.timezones,
    drivingSide: f.drivingSide,
  }
}
