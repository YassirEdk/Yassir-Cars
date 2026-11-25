import { useEffect, useRef, useState } from 'react'
import { CURRENCIES, CURRENCY_CODES, formatMoney } from '../../lib/currency'
import { useCurrency } from '../../lib/CurrencyContext'
import { SORT_OPTIONS } from '../../lib/resultFilters'
import Icon from '../Icon'
import SelectMenu from '../SelectMenu'
import Sheet from '../Sheet'

const SlidersIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" focusable="false" aria-hidden="true">
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" />
  </svg>
)
const SortIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" focusable="false" aria-hidden="true">
    <path d="M8 5v14M4.5 15.5 8 19l3.5-3.5M16 19V5M12.5 8.5 16 5l3.5 3.5" />
  </svg>
)

// One choice among several; a second click on the same one clears it.
function Choice({ label, options, value, onChange }) {
  if (!options.length) return null
  return (
    <div className="flt-group" role="group" aria-label={label}>
      <span className="flt-label">{label}</span>
      <div className="flt-options">
        {options.map(o => (
          <button
            type="button"
            key={o.value}
            className={`flt-opt ${value === o.value ? 'active' : ''}`}
            aria-pressed={value === o.value}
            onClick={() => onChange(value === o.value ? '' : o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function FilterPanel({ filters, choices, onChange, query, onQuery, canHideTaken, withCurrency }) {
  const { currency, setCurrency } = useCurrency()
  const { priceMin, priceMax } = choices
  const max = filters.prix || priceMax

  return (
    <div className="flt">
      <div className="flt-group">
        <label className="flt-label" htmlFor="flt-model">Modèle</label>
        <div className="flt-search">
          <Icon name="search" />
          <input id="flt-model" type="search" placeholder="Rechercher un modèle…" value={query}
            onChange={e => onQuery(e.target.value)} autoComplete="off" />
        </div>
      </div>

      {priceMax > priceMin && (
        <div className="flt-group">
          <label className="flt-label" htmlFor="flt-price">
            Prix max <strong>{filters.prix ? `${formatMoney(max, currency)} / jour` : 'Tous les prix'}</strong>
          </label>
          <input
            id="flt-price"
            className="flt-range"
            type="range"
            min={priceMin}
            max={priceMax}
            step="50"
            value={max}
            style={{ '--fill': `${((max - priceMin) / (priceMax - priceMin)) * 100}%` }}
            onChange={e => { const v = Number(e.target.value); onChange({ prix: v >= priceMax ? 0 : v }) }}
            aria-valuetext={filters.prix ? `${formatMoney(max, currency)} par jour` : 'Tous les prix'}
          />
        </div>
      )}

      <Choice label="Boîte" options={choices.boite} value={filters.boite} onChange={boite => onChange({ boite })} />
      <Choice label="Places" options={choices.places} value={filters.places} onChange={places => onChange({ places })} />
      <Choice label="Carburant" options={choices.carburant} value={filters.carburant} onChange={carburant => onChange({ carburant })} />

      {/* Offered only when there is something to hide. */}
      {(canHideTaken || filters.dispo) && (
        <label className="dispo-toggle flt-dispo">
          <span>Disponibles seulement</span>
          <input type="checkbox" checked={filters.dispo} onChange={e => onChange({ dispo: e.target.checked })} />
        </label>
      )}

      {withCurrency && (
        <Choice
          label="Devise"
          options={CURRENCY_CODES.map(code => ({ value: code, label: CURRENCIES[code].label }))}
          value={currency}
          onChange={code => code && setCurrency(code)}
        />
      )}
    </div>
  )
}

/* Filter, sort and currency controls of the results bar: menus on a wide screen,
   bottom sheets on a phone. */
export default function ResultTools({ isPhone, count, activeCount, filters, choices, onChange, onReset, query, onQuery, canHideTaken }) {
  const { currency, setCurrency } = useCurrency()
  const [open, setOpen] = useState('')          // '' | 'filters' | 'sort'
  const ref = useRef(null)
  const btnRef = useRef(null)
  const close = () => setOpen('')

  useEffect(() => {
    if (open !== 'filters' || isPhone) return
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen('') }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, isPhone])

  const panel = (
    <FilterPanel filters={filters} choices={choices} onChange={onChange} query={query} onQuery={onQuery}
      canHideTaken={canHideTaken} withCurrency={isPhone} />
  )
  const showLabel = count ? `Voir ${count} voiture${count > 1 ? 's' : ''}` : 'Aucune voiture'

  return (
    <div className="results-tools">
      <div
        className="flt-anchor"
        ref={ref}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open === 'filters') { e.stopPropagation(); close(); btnRef.current?.focus() }
        }}
      >
        <button
          type="button"
          ref={btnRef}
          className={`tool-btn ${activeCount ? 'has-filters' : ''}`}
          onClick={() => setOpen(o => (o === 'filters' ? '' : 'filters'))}
          aria-expanded={open === 'filters'}
          aria-haspopup="dialog"
        >
          <SlidersIcon /> Filtres {activeCount > 0 && <span className="tool-btn__n">{activeCount}</span>}
        </button>

        {open === 'filters' && !isPhone && (
          <div className="flt-pop" role="dialog" aria-label="Filtres">
            {panel}
            <div className="flt-pop__foot">
              <button type="button" className="flt-reset" onClick={onReset} disabled={!activeCount}>Effacer</button>
              <button type="button" className="btn btn-dark btn-sm" onClick={close}>{showLabel}</button>
            </div>
          </div>
        )}
      </div>

      {isPhone ? (
        <button type="button" className="tool-btn" onClick={() => setOpen('sort')} aria-expanded={open === 'sort'} aria-haspopup="dialog">
          <SortIcon /> Trier
        </button>
      ) : (
        <>
          <SelectMenu value={filters.tri} onChange={tri => onChange({ tri })} options={SORT_OPTIONS} ariaLabel="Trier par" />
          <SelectMenu
            value={currency}
            onChange={setCurrency}
            options={CURRENCY_CODES.map(code => ({ value: code, label: CURRENCIES[code].label }))}
            ariaLabel="Devise"
            className="results-tools__currency"
          />
        </>
      )}

      {open === 'filters' && isPhone && (
        <Sheet
          title="Filtres"
          onClose={close}
          footer={
            <>
              <button type="button" className="btn btn--quiet" onClick={onReset} disabled={!activeCount}>Effacer</button>
              <button type="button" className="btn btn-dark" onClick={close}>{showLabel}</button>
            </>
          }
        >
          {panel}
        </Sheet>
      )}

      {open === 'sort' && isPhone && (
        <Sheet title="Trier par" onClose={close}>
          <div className="sort-list" role="radiogroup" aria-label="Trier par">
            {SORT_OPTIONS.map(o => (
              <button
                type="button"
                role="radio"
                key={o.value}
                aria-checked={filters.tri === o.value}
                className={`sort-item ${filters.tri === o.value ? 'active' : ''}`}
                onClick={() => { onChange({ tri: o.value }); close() }}
              >
                {o.label} {filters.tri === o.value && <Icon name="check" />}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  )
}
