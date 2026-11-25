/* Date helpers shared by the public pages. Dates travel as ISO days
   ("2026-11-28"); built at local midnight, so a day never shifts. */
const toDate = (iso) => new Date(`${iso}T00:00:00`)

// "28 novembre 2026"
export function formatLongDate(iso) {
  if (!iso) return '—'
  return toDate(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// "28 nov."
export function formatShortDate(iso) {
  if (!iso) return ''
  return toDate(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// "Sam. 28 nov." — with the year only when it isn't this one.
export function formatFriendlyDate(iso) {
  if (!iso) return ''
  const d = toDate(iso)
  const year = d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric'
  const s = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// "28/11"
export function formatDayMonth(iso) {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export function daysBetween(depart, retour) {
  if (!depart || !retour) return 1
  return Math.max(1, Math.ceil((new Date(retour) - new Date(depart)) / 86_400_000))
}
