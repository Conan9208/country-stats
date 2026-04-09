export type GlobePin = {
  id: string
  country_alpha2: string
  message: string
  emoji: string
  link_url: string | null
  tier: 'free' | 'basic' | 'premium'
  created_at: string
  expires_at: string
}
