export type PinKind = 'business' | 'message'

export type GlobePin = {
  id: string
  country_alpha2: string
  kind: PinKind
  // business pins (premium / promo)
  business_name: string | null
  description: string | null
  logo_url: string | null
  website_url: string | null
  // message pins (free / expressive — viral engine)
  emoji: string | null
  message: string | null
  tier: 'free' | 'premium'
  created_at: string
  expires_at: string
}

/** Title shown for a pin regardless of kind (message text or business name). */
export function pinDisplayTitle(pin: GlobePin): string {
  return pin.kind === 'message' ? (pin.message ?? '') : (pin.business_name ?? '')
}

/** Single glyph drawn as the globe marker for a pin. */
export function pinMarkerGlyph(pin: GlobePin): string {
  if (pin.kind === 'message') return pin.emoji || '💬'
  return (pin.business_name?.charAt(0) || '?').toUpperCase()
}
