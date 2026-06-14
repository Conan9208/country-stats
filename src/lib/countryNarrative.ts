import isoCountries from 'i18n-iso-countries'
import localeKo from 'i18n-iso-countries/langs/ko.json'
import localeEn from 'i18n-iso-countries/langs/en.json'

isoCountries.registerLocale(localeKo as Parameters<typeof isoCountries.registerLocale>[0])
isoCountries.registerLocale(localeEn as Parameters<typeof isoCountries.registerLocale>[0])

export type NarrativeInput = {
  code: string
  name: string
  population: number | null
  area: number | null
  capital: string | null
  region: string | null
  subregion: string | null
  languages?: Record<string, string> | null
  timezones?: string[] | null
  borders?: string[] | null
  landlocked?: boolean | null
  unMember?: boolean | null
  startOfWeek?: string | null
  drivingSide?: 'left' | 'right' | null
  demonym?: string | null
  tld?: string[] | null
  independent?: boolean | null
  fifa?: string | null
  iddRoot?: string | null
  iddSuffixes?: string[] | null
  continents?: string[] | null
  currency?: { code: string; name: string; symbol: string } | null
  exchangeRate?: number | null
  gdpUSD: number | null
  gdpYear: string | null
  debtRatio: number | null
  debtYear: string | null
}

export type Narrative = {
  geography: string
  demographics: string
  economy: string
  culture: string
  government: string
  practical: string
}

type Locale = 'ko' | 'en'

const REGION_KO: Record<string, string> = {
  Africa: '아프리카',
  Americas: '아메리카',
  Asia: '아시아',
  Europe: '유럽',
  Oceania: '오세아니아',
  Antarctic: '남극',
}

function tr(text: string): string {
  return text.replace(/\s+([.,])/g, '$1').trim()
}

function localeName(alpha3: string, locale: Locale): string {
  const a2 = isoCountries.alpha3ToAlpha2(alpha3)
  if (!a2) return alpha3
  return isoCountries.getName(a2, locale === 'ko' ? 'ko' : 'en') ?? a2
}

function fmtIntl(n: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'ko' ? 'ko-KR' : 'en-US').format(Math.round(n))
}

function fmtUSD(n: number, locale: Locale): string {
  if (locale === 'ko') {
    if (n >= 1e12) return `${(n / 1e12).toFixed(2)}조 달러`
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}억 달러`
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}백만 달러`
    return `${fmtIntl(n, 'ko')}달러`
  }
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)} trillion`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)} billion`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)} million`
  return `$${fmtIntl(n, 'en')}`
}

function joinList(items: string[], locale: Locale, max = 3): string {
  const arr = items.slice(0, max)
  if (locale === 'ko') {
    if (arr.length === 0) return ''
    if (arr.length === 1) return arr[0]
    return arr.slice(0, -1).join(', ') + ' 그리고 ' + arr[arr.length - 1]
  }
  if (arr.length === 0) return ''
  if (arr.length === 1) return arr[0]
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`
  return `${arr.slice(0, -1).join(', ')}, and ${arr[arr.length - 1]}`
}

function geographyParagraph(d: NarrativeInput, locale: Locale): string {
  const parts: string[] = []
  const region = d.region ? (locale === 'ko' ? REGION_KO[d.region] ?? d.region : d.region) : null
  const subregion = d.subregion

  if (locale === 'ko') {
    if (region && subregion) {
      parts.push(`${d.name}은(는) ${region}의 ${subregion} 지역에 위치한 나라입니다.`)
    } else if (region) {
      parts.push(`${d.name}은(는) ${region}에 위치한 나라입니다.`)
    }
    if (d.area != null) {
      parts.push(`국토 면적은 약 ${fmtIntl(d.area, 'ko')} km²입니다.`)
    }
    if (d.borders && d.borders.length > 0) {
      const names = d.borders.map(c => localeName(c, 'ko')).filter(Boolean)
      if (names.length > 0) {
        parts.push(`국경은 ${joinList(names, 'ko', 4)} 등 ${d.borders.length}개국과 접합니다.`)
      }
    } else if (d.landlocked === false && d.area != null) {
      parts.push('해안선과 접해 있어 바다와 직접 면해 있습니다.')
    }
    if (d.landlocked === true) {
      parts.push('내륙국으로 바다와 직접 접하지 않습니다.')
    }
    if (d.continents && d.continents.length > 1) {
      parts.push(`${joinList(d.continents.map(c => REGION_KO[c] ?? c), 'ko', 3)}에 걸쳐 있는 대륙간 국가입니다.`)
    }
  } else {
    if (region && subregion) {
      parts.push(`${d.name} is a country in ${subregion}, part of the ${region} region.`)
    } else if (region) {
      parts.push(`${d.name} is located in ${region}.`)
    }
    if (d.area != null) {
      parts.push(`It covers an area of approximately ${fmtIntl(d.area, 'en')} km².`)
    }
    if (d.borders && d.borders.length > 0) {
      const names = d.borders.map(c => localeName(c, 'en')).filter(Boolean)
      if (names.length > 0) {
        parts.push(`It shares land borders with ${joinList(names, 'en', 4)}, totalling ${d.borders.length} neighbour${d.borders.length === 1 ? '' : 's'}.`)
      }
    } else if (d.landlocked === false && d.area != null) {
      parts.push('It has direct access to the sea along its coastline.')
    }
    if (d.landlocked === true) {
      parts.push('It is a landlocked country with no direct sea access.')
    }
    if (d.continents && d.continents.length > 1) {
      parts.push(`The territory spans ${joinList(d.continents, 'en', 3)}, making it a transcontinental state.`)
    }
  }
  return tr(parts.join(' '))
}

function demographicsParagraph(d: NarrativeInput, locale: Locale): string {
  const parts: string[] = []
  const density = d.population != null && d.area != null && d.area > 0 ? d.population / d.area : null
  const langs = d.languages ? Object.values(d.languages) : []

  if (locale === 'ko') {
    if (d.population != null) {
      parts.push(`${d.name}의 인구는 약 ${fmtIntl(d.population, 'ko')}명입니다.`)
    }
    if (density != null) {
      parts.push(`인구밀도는 km²당 약 ${density.toFixed(1)}명 수준입니다.`)
    }
    if (langs.length > 0) {
      parts.push(`주요 사용 언어는 ${joinList(langs, 'ko', 3)}${langs.length > 3 ? ' 등' : ''}이며, 공식 인정 언어 수는 ${langs.length}개입니다.`)
    }
    if (d.demonym) {
      parts.push(`이 나라 사람을 영어로 ${d.demonym}이라고 부릅니다.`)
    }
  } else {
    if (d.population != null) {
      parts.push(`${d.name} has a population of approximately ${fmtIntl(d.population, 'en')} people.`)
    }
    if (density != null) {
      parts.push(`Population density is around ${density.toFixed(1)} people per km².`)
    }
    if (langs.length > 0) {
      parts.push(`Its officially recognised languages include ${joinList(langs, 'en', 3)}${langs.length > 3 ? ' and others' : ''}, totalling ${langs.length} language${langs.length === 1 ? '' : 's'}.`)
    }
    if (d.demonym) {
      parts.push(`People from this country are referred to as ${d.demonym}.`)
    }
  }
  return tr(parts.join(' '))
}

function economyParagraph(d: NarrativeInput, locale: Locale): string {
  const parts: string[] = []
  if (locale === 'ko') {
    if (d.gdpUSD != null && d.gdpYear) {
      parts.push(`${d.gdpYear}년 기준 ${d.name}의 명목 GDP는 약 ${fmtUSD(d.gdpUSD, 'ko')}로 집계됩니다.`)
    }
    if (d.debtRatio != null && d.debtYear) {
      parts.push(`${d.debtYear}년 기준 GDP 대비 정부 부채 비율은 ${d.debtRatio.toFixed(1)}% 수준입니다.`)
    }
    if (d.currency) {
      parts.push(`공식 통화는 ${d.currency.name}(${d.currency.code}, 기호 ${d.currency.symbol})입니다.`)
    }
    if (d.currency && d.exchangeRate != null && d.currency.code !== 'USD') {
      parts.push(`현재 환율은 1 USD = ${d.exchangeRate.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${d.currency.code} 수준에서 거래되고 있습니다.`)
    }
  } else {
    if (d.gdpUSD != null && d.gdpYear) {
      parts.push(`As of ${d.gdpYear}, ${d.name} reports a nominal GDP of about ${fmtUSD(d.gdpUSD, 'en')}.`)
    }
    if (d.debtRatio != null && d.debtYear) {
      parts.push(`Government debt stood at roughly ${d.debtRatio.toFixed(1)}% of GDP in ${d.debtYear}.`)
    }
    if (d.currency) {
      parts.push(`The official currency is the ${d.currency.name} (${d.currency.code}, symbol ${d.currency.symbol}).`)
    }
    if (d.currency && d.exchangeRate != null && d.currency.code !== 'USD') {
      parts.push(`The current exchange rate is approximately 1 USD = ${d.exchangeRate.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${d.currency.code}.`)
    }
  }
  return tr(parts.join(' '))
}

function cultureParagraph(d: NarrativeInput, locale: Locale): string {
  const parts: string[] = []
  const tzCount = d.timezones?.length ?? 0
  if (locale === 'ko') {
    if (tzCount === 1 && d.timezones) {
      parts.push(`${d.name}은(는) 단일 시간대(${d.timezones[0]})를 사용합니다.`)
    } else if (tzCount > 1 && d.timezones) {
      parts.push(`${d.name}은(는) 영토 내에 ${tzCount}개의 시간대(${d.timezones.slice(0, 2).join(', ')} 등)를 두고 있습니다.`)
    }
    if (d.startOfWeek) {
      const dayKo: Record<string, string> = { monday: '월요일', sunday: '일요일', saturday: '토요일' }
      parts.push(`한 주의 시작은 ${dayKo[d.startOfWeek] ?? d.startOfWeek}입니다.`)
    }
    if (d.tld && d.tld.length > 0) {
      parts.push(`국가 최상위 도메인(ccTLD)은 ${d.tld.join(', ')}이 사용됩니다.`)
    }
  } else {
    if (tzCount === 1 && d.timezones) {
      parts.push(`${d.name} operates on a single time zone (${d.timezones[0]}).`)
    } else if (tzCount > 1 && d.timezones) {
      parts.push(`${d.name} spans ${tzCount} time zones (including ${d.timezones.slice(0, 2).join(', ')}).`)
    }
    if (d.startOfWeek) {
      parts.push(`The local week is considered to start on ${d.startOfWeek.charAt(0).toUpperCase()}${d.startOfWeek.slice(1)}.`)
    }
    if (d.tld && d.tld.length > 0) {
      parts.push(`Its country-code top-level domain (ccTLD) is ${d.tld.join(', ')}.`)
    }
  }
  return tr(parts.join(' '))
}

function governmentParagraph(d: NarrativeInput, locale: Locale): string {
  const parts: string[] = []
  if (locale === 'ko') {
    if (d.capital) {
      parts.push(`${d.name}의 수도는 ${d.capital}입니다.`)
    }
    if (d.independent === true) {
      parts.push('국제적으로 독립 주권국으로 인정받고 있습니다.')
    } else if (d.independent === false) {
      parts.push('완전한 독립 주권국이 아닌, 종속·자치 영토로 분류됩니다.')
    }
    if (d.unMember === true) {
      parts.push('유엔(UN) 회원국입니다.')
    } else if (d.unMember === false) {
      parts.push('유엔 정식 회원국은 아닙니다.')
    }
  } else {
    if (d.capital) {
      parts.push(`The capital of ${d.name} is ${d.capital}.`)
    }
    if (d.independent === true) {
      parts.push('It is internationally recognised as an independent sovereign state.')
    } else if (d.independent === false) {
      parts.push('It is classified as a dependent or autonomous territory rather than a fully sovereign state.')
    }
    if (d.unMember === true) {
      parts.push('The country is a member state of the United Nations.')
    } else if (d.unMember === false) {
      parts.push('The country is not a UN member state.')
    }
  }
  return tr(parts.join(' '))
}

function practicalParagraph(d: NarrativeInput, locale: Locale): string {
  const parts: string[] = []
  if (locale === 'ko') {
    if (d.drivingSide === 'left') {
      parts.push('차량은 좌측통행을 따릅니다.')
    } else if (d.drivingSide === 'right') {
      parts.push('차량은 우측통행을 따릅니다.')
    }
    if (d.iddRoot) {
      const code = d.iddRoot + (d.iddSuffixes?.[0] ?? '')
      parts.push(`국제전화 국가번호는 ${code}입니다.`)
    }
    if (d.fifa) {
      parts.push(`FIFA 국가코드는 ${d.fifa}이며, ISO 3166-1 alpha-2 코드는 ${d.code}입니다.`)
    } else {
      parts.push(`ISO 3166-1 alpha-2 코드는 ${d.code}입니다.`)
    }
  } else {
    if (d.drivingSide === 'left') {
      parts.push('Traffic drives on the left.')
    } else if (d.drivingSide === 'right') {
      parts.push('Traffic drives on the right.')
    }
    if (d.iddRoot) {
      const code = d.iddRoot + (d.iddSuffixes?.[0] ?? '')
      parts.push(`The international dialling code is ${code}.`)
    }
    if (d.fifa) {
      parts.push(`Its FIFA country code is ${d.fifa}, and its ISO 3166-1 alpha-2 code is ${d.code}.`)
    } else {
      parts.push(`Its ISO 3166-1 alpha-2 code is ${d.code}.`)
    }
  }
  return tr(parts.join(' '))
}

export function buildNarrative(d: NarrativeInput, locale: Locale): Narrative {
  return {
    geography:    geographyParagraph(d, locale),
    demographics: demographicsParagraph(d, locale),
    economy:      economyParagraph(d, locale),
    culture:      cultureParagraph(d, locale),
    government:   governmentParagraph(d, locale),
    practical:    practicalParagraph(d, locale),
  }
}
