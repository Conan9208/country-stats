export type GlobePin = {
  id: string
  country_alpha2: string
  business_name: string
  description: string | null
  logo_url: string | null
  website_url: string | null
  tier: 'free' | 'premium'
  created_at: string
  expires_at: string
}
