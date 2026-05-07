// AdSense ad-unit slot IDs.
// Generate each slot in AdSense Console → Ads → By ad unit, then paste the numeric ID below.
// While a slot is empty string, AdSlot renders nothing — safe to ship before IDs are issued.

export const ADSENSE_CLIENT = 'ca-pub-8766166885849764'

export const AD_SLOTS = {
  countryMid:     '', // Country page — after stat-card grid
  countryArticle: '', // Country page — between "About" and "Geography" sections
  aboutBottom:    '', // About page bottom
  statsTop:       '', // Stats page below SSR header
  homeBottom:     '', // Home page below FAQ
}
