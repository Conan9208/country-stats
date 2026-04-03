const TIMEZONE_MAP: Record<string, string> = {
  AF: 'Asia/Kabul',         AL: 'Europe/Tirane',      DZ: 'Africa/Algiers',
  AO: 'Africa/Luanda',      AR: 'America/Argentina/Buenos_Aires',
  AM: 'Asia/Yerevan',       AU: 'Australia/Sydney',   AT: 'Europe/Vienna',
  AZ: 'Asia/Baku',          BH: 'Asia/Bahrain',       BD: 'Asia/Dhaka',
  BY: 'Europe/Minsk',       BE: 'Europe/Brussels',    BO: 'America/La_Paz',
  BA: 'Europe/Sarajevo',    BR: 'America/Sao_Paulo',  BG: 'Europe/Sofia',
  KH: 'Asia/Phnom_Penh',    CM: 'Africa/Douala',      CA: 'America/Toronto',
  CL: 'America/Santiago',   CN: 'Asia/Shanghai',      CO: 'America/Bogota',
  HR: 'Europe/Zagreb',      CU: 'America/Havana',     CZ: 'Europe/Prague',
  DK: 'Europe/Copenhagen',  EC: 'America/Guayaquil',  EG: 'Africa/Cairo',
  ET: 'Africa/Addis_Ababa', FI: 'Europe/Helsinki',    FR: 'Europe/Paris',
  GE: 'Asia/Tbilisi',       DE: 'Europe/Berlin',      GH: 'Africa/Accra',
  GR: 'Europe/Athens',      GT: 'America/Guatemala',  HN: 'America/Tegucigalpa',
  HK: 'Asia/Hong_Kong',     HU: 'Europe/Budapest',    IS: 'Atlantic/Reykjavik',
  IN: 'Asia/Kolkata',       ID: 'Asia/Jakarta',       IR: 'Asia/Tehran',
  IQ: 'Asia/Baghdad',       IE: 'Europe/Dublin',      IL: 'Asia/Jerusalem',
  IT: 'Europe/Rome',        JM: 'America/Jamaica',    JP: 'Asia/Tokyo',
  JO: 'Asia/Amman',         KZ: 'Asia/Almaty',        KE: 'Africa/Nairobi',
  KP: 'Asia/Pyongyang',     KR: 'Asia/Seoul',         KW: 'Asia/Kuwait',
  LB: 'Asia/Beirut',        LY: 'Africa/Tripoli',     LT: 'Europe/Vilnius',
  LU: 'Europe/Luxembourg',  MY: 'Asia/Kuala_Lumpur',  MX: 'America/Mexico_City',
  MA: 'Africa/Casablanca',  NP: 'Asia/Kathmandu',     NL: 'Europe/Amsterdam',
  NZ: 'Pacific/Auckland',   NG: 'Africa/Lagos',       NO: 'Europe/Oslo',
  PK: 'Asia/Karachi',       PA: 'America/Panama',     PE: 'America/Lima',
  PH: 'Asia/Manila',        PL: 'Europe/Warsaw',      PT: 'Europe/Lisbon',
  QA: 'Asia/Qatar',         RO: 'Europe/Bucharest',   RU: 'Europe/Moscow',
  SA: 'Asia/Riyadh',        SN: 'Africa/Dakar',       RS: 'Europe/Belgrade',
  SG: 'Asia/Singapore',     ZA: 'Africa/Johannesburg',ES: 'Europe/Madrid',
  LK: 'Asia/Colombo',       SE: 'Europe/Stockholm',   CH: 'Europe/Zurich',
  SY: 'Asia/Damascus',      TW: 'Asia/Taipei',        TZ: 'Africa/Dar_es_Salaam',
  TH: 'Asia/Bangkok',       TN: 'Africa/Tunis',       TR: 'Europe/Istanbul',
  UA: 'Europe/Kyiv',        AE: 'Asia/Dubai',         GB: 'Europe/London',
  US: 'America/New_York',   UY: 'America/Montevideo', UZ: 'Asia/Tashkent',
  VE: 'America/Caracas',    VN: 'Asia/Ho_Chi_Minh',   YE: 'Asia/Aden',
  ZM: 'Africa/Lusaka',      ZW: 'Africa/Harare',
}

// 여러 시간대 나라 → 대표 도시명 명시
const CITY_LABEL: Record<string, string> = {
  US: '뉴욕', RU: '모스크바', CA: '토론토', AU: '시드니',
  BR: '상파울루', MX: '멕시코시티', ID: '자카르타', CN: '베이징',
}

export function getLocalTime(alpha2: string): { time: string; city: string | null } | null {
  const key = alpha2.toUpperCase()
  const tz = TIMEZONE_MAP[key]
  if (!tz) return null
  const time = new Intl.DateTimeFormat('ko-KR', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())
  return { time, city: CITY_LABEL[key] ?? null }
}
