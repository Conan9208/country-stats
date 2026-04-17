export interface ElectricalStandard {
  voltage: number       // 대표 전압 (V)
  frequency: number     // 주파수 (Hz)
  plug_types: string[]  // 플러그 타입 (A, B, C, F, G, I 등)
  note?: string         // 특이사항
}

// 전압 범주: 100-127V (저전압) vs 220-240V (고전압)
export type VoltageRange = 'low' | 'high'

export function getVoltageRange(v: number): VoltageRange {
  return v <= 127 ? 'low' : 'high'
}

export interface AdapterStatus {
  needsConverter: boolean
  needsAdapter: boolean
  label: string
  color: string
}

export function getAdapterStatus(
  from: ElectricalStandard,
  to: ElectricalStandard
): AdapterStatus {
  const fromRange = getVoltageRange(from.voltage)
  const toRange   = getVoltageRange(to.voltage)

  if (fromRange !== toRange) {
    return {
      needsConverter: true,
      needsAdapter: true,
      label: `⚠ 변압기 필요 (${from.voltage}V → ${to.voltage}V)`,
      color: '#f87171',
    }
  }

  const toPlugSet = new Set(to.plug_types)
  const hasCompatible = from.plug_types.some(p => toPlugSet.has(p))

  if (!hasCompatible) {
    return {
      needsConverter: false,
      needsAdapter: true,
      label: `어댑터 필요 (Type ${to.plug_types.join('/')})`,
      color: '#fbbf24',
    }
  }

  return { needsConverter: false, needsAdapter: false, label: '호환 가능', color: '#86efac' }
}

// 플러그 타입 설명
export const PLUG_TYPE_LABELS: Record<string, string> = {
  A: 'A형 (납작 2핀)',
  B: 'B형 (납작 3핀)',
  C: 'C형 (둥근 2핀)',
  D: 'D형 (둥근 3핀)',
  E: 'E형 (둥근 2핀+홀)',
  F: 'F형 (둥근 2핀+클립)',
  G: 'G형 (사각 3핀)',
  H: 'H형 (이스라엘)',
  I: 'I형 (사선 3핀)',
  J: 'J형 (스위스)',
  K: 'K형 (덴마크)',
  L: 'L형 (이탈리아)',
  M: 'M형 (대형 둥근 3핀)',
  N: 'N형 (브라질)',
}

// 국가별 전기 표준 (ISO alpha-2 기준)
export const ELECTRICAL_STANDARDS: Record<string, ElectricalStandard> = {
  // ── 동아시아 ──────────────────────────────────────────
  KR: { voltage: 220, frequency: 60, plug_types: ['C', 'F'] },
  JP: { voltage: 100, frequency: 50, plug_types: ['A', 'B'],
        note: '100V (전 세계 유일). 동부 50Hz, 서부 60Hz. 110V 이상 기기는 확인 필요.' },
  CN: { voltage: 220, frequency: 50, plug_types: ['A', 'C', 'I'] },
  TW: { voltage: 110, frequency: 60, plug_types: ['A', 'B'] },
  HK: { voltage: 220, frequency: 50, plug_types: ['G'] },
  MO: { voltage: 220, frequency: 50, plug_types: ['G'] },
  MN: { voltage: 220, frequency: 50, plug_types: ['C', 'E'] },

  // ── 동남아시아 ────────────────────────────────────────
  TH: { voltage: 220, frequency: 50, plug_types: ['A', 'B', 'C'] },
  VN: { voltage: 220, frequency: 50, plug_types: ['A', 'C'] },
  PH: { voltage: 220, frequency: 60, plug_types: ['A', 'B', 'C'] },
  SG: { voltage: 230, frequency: 50, plug_types: ['G'] },
  MY: { voltage: 240, frequency: 50, plug_types: ['G'] },
  ID: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  MM: { voltage: 230, frequency: 50, plug_types: ['A', 'C', 'D', 'G'] },
  KH: { voltage: 230, frequency: 50, plug_types: ['A', 'C', 'G'] },
  LA: { voltage: 230, frequency: 50, plug_types: ['A', 'B', 'C'] },
  BN: { voltage: 240, frequency: 50, plug_types: ['G'] },
  TL: { voltage: 220, frequency: 50, plug_types: ['C', 'E', 'F', 'I'] },

  // ── 남아시아 ──────────────────────────────────────────
  IN: { voltage: 230, frequency: 50, plug_types: ['C', 'D', 'M'] },
  PK: { voltage: 230, frequency: 50, plug_types: ['C', 'D', 'M'] },
  BD: { voltage: 220, frequency: 50, plug_types: ['C', 'D', 'G', 'K'] },
  LK: { voltage: 230, frequency: 50, plug_types: ['D', 'M'] },
  NP: { voltage: 230, frequency: 50, plug_types: ['C', 'D', 'M'] },
  MV: { voltage: 230, frequency: 50, plug_types: ['D', 'G', 'J', 'K', 'L'] },
  BT: { voltage: 230, frequency: 50, plug_types: ['D', 'F'] },

  // ── 중앙아시아 ────────────────────────────────────────
  KZ: { voltage: 220, frequency: 50, plug_types: ['C', 'F'] },
  UZ: { voltage: 220, frequency: 50, plug_types: ['C', 'I'] },
  TM: { voltage: 220, frequency: 50, plug_types: ['B', 'F'] },
  TJ: { voltage: 220, frequency: 50, plug_types: ['C', 'F'] },
  KG: { voltage: 220, frequency: 50, plug_types: ['C', 'F'] },

  // ── 서아시아 / 중동 ───────────────────────────────────
  AE: { voltage: 230, frequency: 50, plug_types: ['G'] },
  SA: { voltage: 127, frequency: 60, plug_types: ['A', 'B', 'G'],
        note: '대부분 127V/60Hz. 일부 지역(리야드 동부 등)은 220V/50Hz 혼재.' },
  IL: { voltage: 230, frequency: 50, plug_types: ['C', 'H'] },
  TR: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  IR: { voltage: 220, frequency: 50, plug_types: ['C', 'F'] },
  IQ: { voltage: 230, frequency: 50, plug_types: ['C', 'D', 'G'] },
  SY: { voltage: 220, frequency: 50, plug_types: ['C', 'E', 'L'] },
  LB: { voltage: 230, frequency: 50, plug_types: ['A', 'B', 'C', 'D'] },
  JO: { voltage: 230, frequency: 50, plug_types: ['B', 'C', 'D', 'F', 'G'] },
  KW: { voltage: 240, frequency: 50, plug_types: ['G'] },
  QA: { voltage: 240, frequency: 50, plug_types: ['G'] },
  BH: { voltage: 230, frequency: 50, plug_types: ['G'] },
  OM: { voltage: 240, frequency: 50, plug_types: ['G'] },
  YE: { voltage: 230, frequency: 50, plug_types: ['A', 'D', 'G'] },
  AF: { voltage: 220, frequency: 50, plug_types: ['C', 'F'] },

  // ── 코카서스 ──────────────────────────────────────────
  GE: { voltage: 220, frequency: 50, plug_types: ['C', 'F'] },
  AM: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  AZ: { voltage: 220, frequency: 50, plug_types: ['C', 'F'] },

  // ── 북아메리카 ────────────────────────────────────────
  US: { voltage: 120, frequency: 60, plug_types: ['A', 'B'] },
  CA: { voltage: 120, frequency: 60, plug_types: ['A', 'B'] },
  MX: { voltage: 127, frequency: 60, plug_types: ['A', 'B'] },

  // ── 중앙아메리카 / 카리브해 ───────────────────────────
  GT: { voltage: 120, frequency: 60, plug_types: ['A', 'B'] },
  BZ: { voltage: 110, frequency: 60, plug_types: ['A', 'B'] },
  HN: { voltage: 110, frequency: 60, plug_types: ['A', 'B'] },
  SV: { voltage: 115, frequency: 60, plug_types: ['A', 'B'] },
  NI: { voltage: 120, frequency: 60, plug_types: ['A', 'B'] },
  CR: { voltage: 120, frequency: 60, plug_types: ['A', 'B'] },
  PA: { voltage: 110, frequency: 60, plug_types: ['A', 'B'] },
  CU: { voltage: 110, frequency: 60, plug_types: ['A', 'B', 'C'],
        note: '110V와 220V가 혼재.' },
  JM: { voltage: 110, frequency: 50, plug_types: ['A', 'B'] },
  HT: { voltage: 110, frequency: 60, plug_types: ['A', 'B'] },
  DO: { voltage: 110, frequency: 60, plug_types: ['A', 'B'] },
  TT: { voltage: 115, frequency: 60, plug_types: ['A', 'B'] },
  BB: { voltage: 115, frequency: 50, plug_types: ['A', 'B'] },

  // ── 남아메리카 ────────────────────────────────────────
  BR: { voltage: 127, frequency: 60, plug_types: ['C', 'N'],
        note: '상파울루·리우 등 주요 도시는 127V. 일부 북부·브라질리아 지역은 220V. 반드시 사전 확인 필요.' },
  AR: { voltage: 220, frequency: 50, plug_types: ['C', 'I'] },
  CL: { voltage: 220, frequency: 50, plug_types: ['C', 'L'] },
  CO: { voltage: 110, frequency: 60, plug_types: ['A', 'B'] },
  PE: { voltage: 220, frequency: 60, plug_types: ['A', 'C'] },
  VE: { voltage: 120, frequency: 60, plug_types: ['A', 'B'] },
  EC: { voltage: 120, frequency: 60, plug_types: ['A', 'B'] },
  BO: { voltage: 220, frequency: 50, plug_types: ['A', 'C'],
        note: '라파스 등 고지대는 220V/50Hz. 일부 지역 110V 혼재.' },
  PY: { voltage: 220, frequency: 50, plug_types: ['C'] },
  UY: { voltage: 220, frequency: 50, plug_types: ['C', 'F', 'I', 'L'] },
  GY: { voltage: 240, frequency: 60, plug_types: ['A', 'B'] },
  SR: { voltage: 127, frequency: 60, plug_types: ['C', 'F'] },

  // ── 서유럽 ────────────────────────────────────────────
  GB: { voltage: 230, frequency: 50, plug_types: ['G'] },
  IE: { voltage: 230, frequency: 50, plug_types: ['G'] },
  FR: { voltage: 230, frequency: 50, plug_types: ['C', 'E'] },
  DE: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  ES: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  PT: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  IT: { voltage: 230, frequency: 50, plug_types: ['C', 'F', 'L'] },
  NL: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  BE: { voltage: 230, frequency: 50, plug_types: ['C', 'E'] },
  LU: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  AT: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  CH: { voltage: 230, frequency: 50, plug_types: ['C', 'J'] },
  LI: { voltage: 230, frequency: 50, plug_types: ['C', 'J'] },
  MC: { voltage: 230, frequency: 50, plug_types: ['C', 'E', 'F'] },
  AD: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  SM: { voltage: 230, frequency: 50, plug_types: ['C', 'F', 'L'] },
  VA: { voltage: 230, frequency: 50, plug_types: ['C', 'F', 'L'] },

  // ── 북유럽 ────────────────────────────────────────────
  SE: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  NO: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  DK: { voltage: 230, frequency: 50, plug_types: ['C', 'E', 'K'] },
  FI: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  IS: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },

  // ── 동유럽 / 발트 / 발칸 ─────────────────────────────
  PL: { voltage: 230, frequency: 50, plug_types: ['C', 'E'] },
  CZ: { voltage: 230, frequency: 50, plug_types: ['C', 'E'] },
  SK: { voltage: 230, frequency: 50, plug_types: ['C', 'E'] },
  HU: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  RO: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  BG: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  HR: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  SI: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  RS: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  BA: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  ME: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  MK: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  AL: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  GR: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  LT: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  LV: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  EE: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  BY: { voltage: 220, frequency: 50, plug_types: ['C', 'F'] },
  UA: { voltage: 220, frequency: 50, plug_types: ['C', 'F'] },
  MD: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  RU: { voltage: 220, frequency: 50, plug_types: ['C', 'F'] },

  // ── 오세아니아 ────────────────────────────────────────
  AU: { voltage: 230, frequency: 50, plug_types: ['I'] },
  NZ: { voltage: 230, frequency: 50, plug_types: ['I'] },
  FJ: { voltage: 240, frequency: 50, plug_types: ['I'] },
  PG: { voltage: 240, frequency: 50, plug_types: ['I'] },

  // ── 아프리카 ──────────────────────────────────────────
  ZA: { voltage: 230, frequency: 50, plug_types: ['M', 'N', 'C'] },
  EG: { voltage: 220, frequency: 50, plug_types: ['C', 'F'] },
  MA: { voltage: 220, frequency: 50, plug_types: ['C', 'E'] },
  TN: { voltage: 230, frequency: 50, plug_types: ['C', 'E'] },
  DZ: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  LY: { voltage: 127, frequency: 50, plug_types: ['D', 'L'],
        note: '구 도시는 127V, 신 도시는 220V 혼재.' },
  NG: { voltage: 230, frequency: 50, plug_types: ['D', 'G'] },
  KE: { voltage: 240, frequency: 50, plug_types: ['G'] },
  TZ: { voltage: 230, frequency: 50, plug_types: ['G'] },
  ET: { voltage: 220, frequency: 50, plug_types: ['C', 'E', 'F', 'L'] },
  GH: { voltage: 230, frequency: 50, plug_types: ['D', 'G'] },
  SN: { voltage: 230, frequency: 50, plug_types: ['C', 'D', 'E'] },
  CM: { voltage: 220, frequency: 50, plug_types: ['C', 'E'] },
  CI: { voltage: 220, frequency: 50, plug_types: ['C', 'E'] },
  ZW: { voltage: 240, frequency: 50, plug_types: ['D', 'G'] },
  UG: { voltage: 240, frequency: 50, plug_types: ['G'] },
  MZ: { voltage: 220, frequency: 50, plug_types: ['C', 'F', 'M'] },
  MG: { voltage: 127, frequency: 50, plug_types: ['C', 'D', 'E', 'J', 'K'],
        note: '일부 지역 220V 혼재.' },
}

// 지역 기본값 (등록되지 않은 국가용)
export const REGION_DEFAULTS: Record<string, ElectricalStandard> = {
  Europe: { voltage: 230, frequency: 50, plug_types: ['C', 'F'] },
  Asia: { voltage: 220, frequency: 50, plug_types: ['C', 'F'] },
  Africa: { voltage: 220, frequency: 50, plug_types: ['C', 'F'] },
  Americas: { voltage: 120, frequency: 60, plug_types: ['A', 'B'] },
  Oceania: { voltage: 230, frequency: 50, plug_types: ['I'] },
}

export function getElectrical(cca2: string, region?: string): ElectricalStandard | null {
  return ELECTRICAL_STANDARDS[cca2] ?? (region ? REGION_DEFAULTS[region] ?? null : null)
}
