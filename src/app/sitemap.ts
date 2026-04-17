import { MetadataRoute } from 'next'

const BASE_URL = 'https://postmyglobe.com'
const LOCALES = ['ko', 'en']

const STATIC_ROUTES = ['', '/about', '/privacy', '/contact', '/donate']

// ISO 3166-1 alpha-2 codes for sovereign states with World Bank coverage
const COUNTRY_CODES = [
  'AF', 'AL', 'DZ', 'AD', 'AO', 'AG', 'AR', 'AM', 'AU', 'AT', 'AZ',
  'BS', 'BH', 'BD', 'BB', 'BY', 'BE', 'BZ', 'BJ', 'BT', 'BO', 'BA', 'BW', 'BR', 'BN', 'BG', 'BF', 'BI',
  'CV', 'KH', 'CM', 'CA', 'CF', 'TD', 'CL', 'CN', 'CO', 'KM', 'CG', 'CD', 'CR', 'CI', 'HR', 'CU', 'CY', 'CZ',
  'DK', 'DJ', 'DM', 'DO',
  'EC', 'EG', 'SV', 'GQ', 'ER', 'EE', 'SZ', 'ET',
  'FJ', 'FI', 'FR',
  'GA', 'GM', 'GE', 'DE', 'GH', 'GR', 'GD', 'GT', 'GN', 'GW', 'GY',
  'HT', 'VA', 'HN', 'HU',
  'IS', 'IN', 'ID', 'IR', 'IQ', 'IE', 'IL', 'IT',
  'JM', 'JP', 'JO',
  'KZ', 'KE', 'KI', 'KP', 'KR', 'KW', 'KG',
  'LA', 'LV', 'LB', 'LS', 'LR', 'LY', 'LI', 'LT', 'LU',
  'MG', 'MW', 'MY', 'MV', 'ML', 'MT', 'MH', 'MR', 'MU', 'MX', 'FM', 'MD', 'MC', 'MN', 'ME', 'MA', 'MZ', 'MM',
  'NA', 'NR', 'NP', 'NL', 'NZ', 'NI', 'NE', 'NG', 'MK', 'NO',
  'OM',
  'PK', 'PW', 'PA', 'PG', 'PY', 'PE', 'PH', 'PL', 'PT',
  'QA',
  'RO', 'RU', 'RW',
  'KN', 'LC', 'VC', 'WS', 'SM', 'ST', 'SA', 'SN', 'RS', 'SC', 'SL', 'SG', 'SK', 'SI', 'SB', 'SO', 'ZA', 'SS', 'ES', 'LK', 'SD', 'SR', 'SE', 'CH', 'SY',
  'TJ', 'TZ', 'TH', 'TL', 'TG', 'TO', 'TT', 'TN', 'TR', 'TM', 'TV',
  'UG', 'UA', 'AE', 'GB', 'US', 'UY', 'UZ',
  'VU', 'VE', 'VN',
  'YE',
  'ZM', 'ZW',
  'PS', 'TW',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = []

  // 정적 페이지
  for (const locale of LOCALES) {
    for (const route of STATIC_ROUTES) {
      entries.push({
        url: `${BASE_URL}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: route === '' ? 'daily' : 'monthly',
        priority: route === '' ? 1.0 : 0.7,
      })
    }
  }

  // 국가별 부채 페이지 (195개 × 2 locale)
  for (const locale of LOCALES) {
    for (const code of COUNTRY_CODES) {
      entries.push({
        url: `${BASE_URL}/${locale}/countries/${code.toLowerCase()}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }
  }

  // 인기 여행 루트 (from × to 조합, 자국 제외) × 2 locale ≈ 380 entries
  const POPULAR_FROM = ['KR', 'US', 'JP', 'CN', 'GB', 'DE', 'FR', 'AU', 'IN', 'CA']
  const POPULAR_TO   = ['US', 'JP', 'KR', 'CN', 'TH', 'VN', 'FR', 'DE', 'GB', 'AU',
                        'IT', 'ES', 'TR', 'GR', 'ID', 'PH', 'MY', 'SG', 'TW', 'CA']
  for (const locale of LOCALES) {
    for (const from of POPULAR_FROM) {
      for (const to of POPULAR_TO) {
        if (from === to) continue
        entries.push({
          url: `${BASE_URL}/${locale}/travel/${from}/${to}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: from === 'KR' ? 0.9 : 0.7,
        })
      }
    }
  }

  return entries
}
