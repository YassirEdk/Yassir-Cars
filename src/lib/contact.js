/* ── Shared contact helpers ───────────────────────────────────────────────────
   Every outbound contact path on the site (result card, phone modal, réservation
   form, contact form) goes through here, so the wa.me URL is built one way and
   phone numbers are displayed one way.                                         */

// International digits → readable: "212661234567" → "+212 661 234 567".
export function formatPhone(digits) {
  const s = String(digits || '').replace(/\D/g, '')
  if (!s) return ''
  const cc = s.slice(0, 3)
  const rest = s.slice(3).replace(/(\d{3})(?=\d)/g, '$1 ')
  return `+${cc} ${rest}`.trim()
}

// Pre-filled WhatsApp link. `number` is international digits, no leading 0.
export function waLink(number, text = '') {
  const n = String(number || '').replace(/\D/g, '')
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}
