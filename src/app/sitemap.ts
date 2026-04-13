import { MetadataRoute } from 'next'

const BASE_URL = 'https://postmyglobe.com'
const LOCALES = ['ko', 'en']

const STATIC_ROUTES = ['', '/about', '/privacy', '/contact', '/donate']

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = []

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

  return entries
}
