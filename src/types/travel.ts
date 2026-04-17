export interface Region {
  id: string
  label_ko: string
  label_en: string
  timezone: string           // IANA timezone e.g. "America/New_York"
  representativeCity: string // wttr.in 검색용 도시명
}

export interface CountryBasic {
  cca2: string
  name: string
  flag: string
  capital: string
  population: number
  area: number
  region: string
  languages: string[]
  currency: { code: string; name: string; symbol: string }
  timezones: string[]
  drivingSide: 'left' | 'right'
}

export interface WeatherInfo {
  temp_c: number
  feels_like_c: number
  description: string
  icon_url: string
}

export interface TravelData {
  from: CountryBasic
  to: CountryBasic
  toRegion?: Region
  fromWeather?: WeatherInfo
  toWeather?: WeatherInfo
  exchangeRate?: number   // 1 from통화 → to통화 비율
  timeDiffHours?: number  // 양수: to가 앞섬, 음수: to가 뒤처짐
}
