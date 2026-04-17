// WMO 기상 코드 → 한국어 설명 + 이모지
// wttr.in j1 포맷의 weatherCode 필드 기준
export interface WeatherLabel {
  ko: string
  emoji: string
}

const WEATHER_CODES: Record<number, WeatherLabel> = {
  113: { ko: '맑음',             emoji: '☀️' },
  116: { ko: '구름 조금',        emoji: '⛅' },
  119: { ko: '흐림',             emoji: '☁️' },
  122: { ko: '잔뜩 흐림',        emoji: '🌥️' },
  143: { ko: '안개',             emoji: '🌫️' },
  176: { ko: '가끔 비',          emoji: '🌦️' },
  179: { ko: '가끔 눈',          emoji: '🌨️' },
  182: { ko: '진눈깨비 가능',    emoji: '🌧️' },
  185: { ko: '어는 이슬비 가능', emoji: '🌧️' },
  200: { ko: '천둥 가능',        emoji: '⛈️' },
  227: { ko: '눈보라',           emoji: '🌬️' },
  230: { ko: '강한 눈보라',      emoji: '❄️' },
  248: { ko: '안개',             emoji: '🌫️' },
  260: { ko: '어는 안개',        emoji: '🌫️' },
  263: { ko: '가벼운 이슬비',    emoji: '🌦️' },
  266: { ko: '이슬비',           emoji: '🌦️' },
  281: { ko: '어는 이슬비',      emoji: '🌧️' },
  284: { ko: '강한 어는 이슬비', emoji: '🌧️' },
  293: { ko: '가벼운 비',        emoji: '🌦️' },
  296: { ko: '가벼운 비',        emoji: '🌧️' },
  299: { ko: '보통 비',          emoji: '🌧️' },
  302: { ko: '보통 비',          emoji: '🌧️' },
  305: { ko: '강한 비',          emoji: '🌧️' },
  308: { ko: '폭우',             emoji: '⛈️' },
  311: { ko: '가벼운 빙우',      emoji: '🌧️' },
  314: { ko: '강한 빙우',        emoji: '🌧️' },
  317: { ko: '가벼운 진눈깨비',  emoji: '🌨️' },
  320: { ko: '진눈깨비',         emoji: '🌨️' },
  323: { ko: '가벼운 눈',        emoji: '🌨️' },
  326: { ko: '가벼운 눈',        emoji: '🌨️' },
  329: { ko: '보통 눈',          emoji: '🌨️' },
  332: { ko: '보통 눈',          emoji: '❄️' },
  335: { ko: '강한 눈',          emoji: '❄️' },
  338: { ko: '폭설',             emoji: '❄️' },
  350: { ko: '싸락눈',           emoji: '🌨️' },
  353: { ko: '가벼운 소나기',    emoji: '🌦️' },
  356: { ko: '소나기',           emoji: '🌧️' },
  359: { ko: '강한 소나기',      emoji: '⛈️' },
  362: { ko: '진눈깨비 소나기',  emoji: '🌨️' },
  365: { ko: '강한 진눈깨비',    emoji: '🌨️' },
  368: { ko: '가벼운 눈 소나기', emoji: '🌨️' },
  371: { ko: '강한 눈 소나기',   emoji: '❄️' },
  374: { ko: '싸락눈 소나기',    emoji: '🌨️' },
  377: { ko: '강한 싸락눈',      emoji: '🌨️' },
  386: { ko: '뇌우',             emoji: '⛈️' },
  389: { ko: '강한 뇌우',        emoji: '⛈️' },
  392: { ko: '눈 뇌우',          emoji: '⛈️' },
  395: { ko: '강한 눈 뇌우',     emoji: '⛈️' },
}

export function getWeatherLabel(code: number): WeatherLabel {
  return WEATHER_CODES[code] ?? { ko: '-', emoji: '🌡️' }
}
