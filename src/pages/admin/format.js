// ── Small formatting helpers shared across the admin panels ───────────────────

// Show a number grouped by thousands with dots: 152687 → "152.687".
export const formatKm = (val) => {
  const d = String(val ?? '').replace(/\D/g, '')
  return d ? d.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''
}

// Show an ISO date (2026-10-16) as JJ/MM/AAAA → "16/10/2026".
export const formatDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = String(iso).split('-')
  return (y && m && d) ? `${d}/${m}/${y}` : iso
}

// Distance covered during a finished rental (null if we can't compute it).
export const kmDone = (r) =>
  (r.returnKm != null && r.departureKm != null && r.returnKm >= r.departureKm)
    ? r.returnKm - r.departureKm
    : null
