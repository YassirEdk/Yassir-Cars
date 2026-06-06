import DatePicker from '../../components/DatePicker'

/* ── Reusable filter bar (search + date range) for the list pop-ups ───────── */
export default function ListFilters({ q, setQ, from, setFrom, to, setTo, placeholder }) {
  return (
    <div className="admin-list-modal__filters">
      <input className="admin-search" type="search" placeholder={placeholder} value={q} onChange={e => setQ(e.target.value)} />
      <label>Du <DatePicker value={from} onChange={setFrom} placeholder="JJ-MMM-AAAA" allowPast /></label>
      <label>Au <DatePicker value={to} onChange={setTo} min={from || undefined} placeholder="JJ-MMM-AAAA" allowPast /></label>
      {(q || from || to) && (
        <button className="admin-btn admin-btn--sm" onClick={() => { setQ(''); setFrom(''); setTo('') }}>Réinitialiser</button>
      )}
    </div>
  )
}
