// Curated emoji set for free message pins.
// Shared between the submit UI (picker) and the API (server-side allowlist),
// so a tampered request can't inject arbitrary glyphs as a "message pin emoji".
export const PIN_EMOJIS = [
  '❤️', '🔥', '✨', '😍', '🎉', '👍', '🙏', '😂',
  '🥹', '🌟', '🍀', '💜', '🫶', '👏', '😎', '🥳',
  '✈️', '🏆', '💪', '🌈', '🌍', '⭐',
] as const

export type PinEmoji = (typeof PIN_EMOJIS)[number]

export const MAX_MESSAGE_LEN = 80

export function isAllowedPinEmoji(emoji: unknown): emoji is PinEmoji {
  return typeof emoji === 'string' && (PIN_EMOJIS as readonly string[]).includes(emoji)
}
