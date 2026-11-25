import { useEffect, useState } from 'react'
import { pickupPlaces, addDays, searchCategoryOptions } from '../../data'
import { useSettings } from '../../lib/SettingsContext'
import { PHONE, useMediaQuery } from '../../hooks/useMediaQuery'
import { formatShortDate, daysBetween } from '../../lib/dates'
import CityMenu from '../CityMenu'
import SelectMenu from '../SelectMenu'
import SearchField from '../SearchField'
import DatePicker from '../DatePicker'
import Icon from '../Icon'
import Sheet from '../Sheet'

function SearchForm({ search, onSearch }) {
  const { settings } = useSettings()
  const minDays = settings.minRentalDays
  const [form, setForm] = useState(search)
  // The category pills below change it too.
  useEffect(() => { setForm(f => ({ ...f, categorie: search.categorie })) }, [search.categorie])
  // As on the home page: a place opens the start calendar, a start the return one.
  const [openDepart, setOpenDepart] = useState(0)
  const [openRetour, setOpenRetour] = useState(0)

  // A start date past the return date pushes the return along with it.
  const setDepart = (iso) => {
    setForm(f => ({
      ...f,
      depart: iso,
      retour: f.retour && f.retour < addDays(iso, minDays) ? addDays(iso, minDays) : f.retour,
    }))
    setOpenRetour(n => n + 1)
  }

  return (
    <form className="mini-search-form" onSubmit={e => { e.preventDefault(); onSearch(form) }}>
      <div className="bk-fields bk-fields--compact">
        <SearchField id="lieu" icon="pin" label="Lieu">
          <CityMenu
            value={form.lieu}
            onChange={(lieu) => { setForm(f => ({ ...f, lieu })); setOpenDepart(n => n + 1) }}
            cities={pickupPlaces}
            ariaLabel="Lieu"
            className="smenu--field"
            flip
          />
        </SearchField>
        <SearchField id="depart" icon="calendar" label="Départ">
          <DatePicker value={form.depart} onChange={setDepart} openKey={openDepart} ariaLabel="Date de départ" placeholder="Choisir une date" friendly flip />
        </SearchField>
        <SearchField id="retour" icon="calendar" label="Retour">
          <DatePicker
            value={form.retour}
            onChange={(retour) => setForm(f => ({ ...f, retour }))}
            min={form.depart ? addDays(form.depart, minDays) : undefined}
            highlight={form.depart || undefined}
            openKey={openRetour}
            ariaLabel="Date de retour"
            placeholder="Choisir une date"
            friendly
            flip
          />
        </SearchField>
        <SearchField id="categorie" icon="car" label="Catégorie">
          <SelectMenu
            value={form.categorie}
            onChange={(categorie) => setForm(f => ({ ...f, categorie }))}
            options={searchCategoryOptions}
            ariaLabel="Catégorie"
            className="smenu--field"
            flip
          />
        </SearchField>
      </div>
      <button type="submit" className="btn btn-primary mini-search__go" title="Relancer la recherche">
        <svg className="mini-search__go-icon" viewBox="0 0 24 24" width="17" height="17" fill="none"
          stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
          focusable="false" aria-hidden="true">
          <path d="M23 4v6h-6" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
        <span className="mini-search__go-text">Relancer</span>
      </button>
    </form>
  )
}

/* The search on top of the results: the whole form on a wide screen, one line
   that opens it in a sheet on a phone, so the cars come first. */
export default function SearchBar({ search, onSearch }) {
  const isPhone = useMediaQuery(PHONE)
  const [editing, setEditing] = useState(false)

  if (!isPhone) {
    return (
      <div className="mini-search">
        <div className="container"><SearchForm search={search} onSearch={onSearch} /></div>
      </div>
    )
  }

  const { lieu, depart, retour } = search
  const days = daysBetween(depart, retour)
  return (
    <div className="search-summary">
      <div className="container">
        <button type="button" className="search-summary__btn" onClick={() => setEditing(true)} aria-haspopup="dialog"
          aria-label="Modifier la recherche">
          <Icon name="search" className="search-summary__icon" />
          <span className="search-summary__txt">
            <strong>{lieu || 'Choisir un lieu'}</strong>
            {depart ? (
              <span className="search-summary__dates">
                <span>{formatShortDate(depart)}</span>
                {retour && <><Icon name="arrowRight" className="search-summary__arrow" /><span>{formatShortDate(retour)}</span></>}
                {days > 1 && <span className="search-summary__days">{days} jours</span>}
              </span>
            ) : (
              <span>Ajouter des dates</span>
            )}
          </span>
          <span className="search-summary__edit">Modifier</span>
        </button>
      </div>

      {editing && (
        <Sheet title="Modifier la recherche" className="sheet__panel--search" onClose={() => setEditing(false)}>
          <SearchForm search={search} onSearch={(form) => { setEditing(false); onSearch(form) }} />
        </Sheet>
      )}
    </div>
  )
}
