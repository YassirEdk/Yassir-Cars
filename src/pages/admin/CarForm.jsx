import { useState, useRef } from 'react'
import { showError } from '../../components/AdminDialog'
import { carColors, colorName, carFeatures } from '../../data'
import Icon from '../../components/Icon'
import { uploadCarPhotos, createCar, updateCar } from '../../lib/cars'

export const CATEGORIES = [
  { value: 'economique', label: 'Économique' },
  { value: 'citadine',   label: 'Citadine' },
  { value: 'berline',    label: 'Berline' },
  { value: 'suv',        label: 'SUV / 4x4' },
  { value: 'luxe',       label: 'Luxe' },
  { value: 'utilitaire', label: 'Utilitaire' },
]

export const EMPTY_CAR = {
  name: '', category: 'economique', categories: ['economique'], photo: '', photos: [],
  brandLogo: '', brandColor: '#1a1a1a', whiteFilter: false,
  price: 250, currency: 'MAD', fuel: 'Diesel', transmission: 'Manuel',
  seats: 5, features: [], badge: '', sortOrder: 0,
  color: '', immatriculation: '', damaged: false,
}

/* ── Add / edit car form ──────────────────────────────────────────────────── */
export default function CarForm({ initial, onSaved, onCancel }) {
  const [car, setCar] = useState(initial)
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)   // file drop highlight
  const dragIndex = useRef(null)                     // thumbnail being reordered
  const set = (k, v) => setCar(c => ({ ...c, [k]: v }))

  // Toggle a category on/off. `category` (main label) stays in sync with the
  // first selected one so the cards keep showing a sensible label.
  const toggleCat = (value) => setCar(c => {
    const current = c.categories ?? []
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    return { ...c, categories: next, category: next[0] ?? '' }
  })

  // Toggle an équipement/feature on/off (multi-select, like categories).
  const toggleFeature = (value) => setCar(c => {
    const current = c.features ?? []
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    return { ...c, features: next }
  })

  // Upload one or more files → append their URLs to the gallery.
  const uploadFiles = async (files) => {
    const imgs = files.filter(f => f.type.startsWith('image/'))
    if (!imgs.length) return
    setUploading(true)
    try {
      const urls = await uploadCarPhotos(imgs)
      setCar(c => {
        const photos = [...(c.photos ?? []), ...urls]
        return { ...c, photos, photo: photos[0] }
      })
    } catch (err) { showError('Échec de l’upload : ' + err.message) }
    setUploading(false)
  }

  const handlePhotos = (e) => {
    uploadFiles(Array.from(e.target.files ?? []))
    e.target.value = '' // allow re-selecting the same file(s)
  }

  // Drop image files from the computer onto the photos area.
  const handleDrop = (e) => {
    if (!e.dataTransfer.files?.length) return
    e.preventDefault()
    setDragOver(false)
    uploadFiles(Array.from(e.dataTransfer.files))
  }

  // Reorder thumbnails by dragging one onto another (index 0 = cover).
  const reorder = (from, to) => setCar(c => {
    const photos = [...(c.photos ?? [])]
    const [moved] = photos.splice(from, 1)
    photos.splice(to, 0, moved)
    return { ...c, photos, photo: photos[0] }
  })

  const removePhoto = (i) => setCar(c => {
    const photos = (c.photos ?? []).filter((_, idx) => idx !== i)
    return { ...c, photos, photo: photos[0] || '' }
  })

  // Promote a photo to first position (= the cover shown on cards).
  const makeCover = (i) => setCar(c => {
    const photos = [...(c.photos ?? [])]
    const [pic] = photos.splice(i, 1)
    photos.unshift(pic)
    return { ...c, photos, photo: photos[0] }
  })

  const addPhotoUrl = (url) => setCar(c => {
    const photos = [...(c.photos ?? []), url]
    return { ...c, photos, photo: photos[0] }
  })

  const save = async (e) => {
    e.preventDefault()
    if (!car.name.trim()) return showError('Le nom est obligatoire.')
    if (!(car.categories ?? []).length) return showError('Choisissez au moins une catégorie.')
    setBusy(true)
    try {
      if (car.id) await updateCar(car.id, car)
      else await createCar(car)
      onSaved()
    } catch (err) { showError('Erreur : ' + err.message) }
    setBusy(false)
  }

  return (
    <form className="admin-form" onSubmit={save}>
      <div className="admin-form__head">
        <h3>{car.id ? '✏️ Modifier la voiture' : '➕ Nouvelle voiture'}</h3>
        <p className="admin-muted">Renseignez les informations et ajoutez des photos.</p>
      </div>

      <div className="admin-section">
        <span className="admin-section__label">
          Photos <small className="admin-hint">(glissez-déposez des images · 1ʳᵉ = couverture · réorganisez en glissant)</small>
        </span>
        <div
          className={`admin-photos ${dragOver ? 'drag-over' : ''}`}
          onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragOver(true) } }}
          onDragLeave={e => { if (e.currentTarget === e.target) setDragOver(false) }}
          onDrop={handleDrop}
        >
          {(car.photos ?? []).map((url, i) => (
            <div
              className={`admin-thumb ${i === 0 ? 'admin-thumb--cover' : ''}`}
              key={url + i}
              draggable
              onDragStart={() => { dragIndex.current = i }}
              onDragOver={e => e.preventDefault()}
              onDrop={(e) => {
                e.stopPropagation()
                const from = dragIndex.current
                if (from !== null && from !== i) reorder(from, i)
                dragIndex.current = null
              }}
            >
              <img src={url} alt="" />
              {i === 0 && <span className="admin-thumb__badge">Couverture</span>}
              <div className="admin-thumb__actions">
                {i !== 0 && (
                  <button type="button" title="Définir comme couverture" onClick={() => makeCover(i)}>★</button>
                )}
                <button type="button" title="Supprimer" onClick={() => removePhoto(i)}>✕</button>
              </div>
            </div>
          ))}
          <label className="admin-thumb admin-thumb--add">
            <span>{uploading ? '⏳ Envoi…' : '＋ Ajouter'}</span>
            <input type="file" accept="image/*" multiple hidden onChange={handlePhotos} disabled={uploading} />
          </label>
        </div>
        <input
          type="text" className="admin-photo-url"
          placeholder="…ou collez une URL d’image puis Entrée"
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              const v = e.target.value.trim()
              if (v) { addPhotoUrl(v); e.target.value = '' }
            }
          }}
        />
      </div>

      <div className="admin-grid">
        <label>Nom du modèle *
          <input type="text" value={car.name} onChange={e => set('name', e.target.value)} required />
          <small className="admin-hint">Même nom = fusionné en une seule carte sur le site</small>
        </label>
        <label>Immatriculation
          <input type="text" value={car.immatriculation || ''} onChange={e => set('immatriculation', e.target.value)} placeholder="ex: 12345-A-6" />
        </label>
        <div className="admin-color-field">
          <span>Couleur</span>
          <div className="admin-colors">
            {carColors.map(c => (
              <button
                type="button"
                key={c.hex}
                className={`admin-color-dot ${car.color === c.hex ? 'active' : ''}`}
                style={{ background: c.hex }}
                title={c.name}
                onClick={() => set('color', car.color === c.hex ? '' : c.hex)}
              />
            ))}
            {car.color && <span className="admin-color-name">{colorName(car.color)}</span>}
          </div>
        </div>
        <div className="admin-cats-field">
          <span>Catégories <small className="admin-hint">(cochez une ou plusieurs)</small></span>
          <div className="admin-cats-pick">
            {CATEGORIES.map(c => {
              const on = (car.categories ?? []).includes(c.value)
              return (
                <button
                  type="button"
                  key={c.value}
                  className={`admin-cat-chip ${on ? 'active' : ''}`}
                  onClick={() => toggleCat(c.value)}
                >
                  {on ? '✓ ' : ''}{c.label}
                </button>
              )
            })}
          </div>
        </div>
        <label>Prix / jour (MAD) *
          <input type="number" value={car.price} onChange={e => set('price', e.target.value)} min="0" required />
        </label>
        <label>Carburant *
          <select value={car.fuel} onChange={e => set('fuel', e.target.value)} required>
            <option>Essence</option>
            <option>Diesel</option>
            <option>Hybride</option>
            <option>Electrique</option>
          </select>
        </label>
        <label>Boîte *
          <select value={car.transmission} onChange={e => set('transmission', e.target.value)} required>
            <option>Manuel</option><option>Auto</option>
          </select>
        </label>
        <label>Places *
          <input type="number" value={car.seats} onChange={e => set('seats', e.target.value)} min="1" max="20" required />
        </label>
        <label>Badge (ex: Nouveau)
          <input type="text" value={car.badge || ''} onChange={e => set('badge', e.target.value)} />
          <small className="admin-hint">Couleur auto : Nouveau=bleu · Prestige=or · autres=rouge</small>
        </label>
        <label>Ordre d’affichage
          {/* Shown 1-based to the user (1, 2, 3…) but stored 0-based. */}
          <input
            type="number" min="1"
            value={(Number(car.sortOrder) || 0) + 1}
            onChange={e => set('sortOrder', Math.max(0, (Number(e.target.value) || 1) - 1))}
          />
        </label>
      </div>

      <div className="admin-section">
        <span className="admin-section__label">
          Équipements <small className="admin-hint">(cochez tout ce que la voiture possède)</small>
        </span>
        <div className="admin-cats-pick admin-features-pick">
          {carFeatures.map(f => {
            const on = (car.features ?? []).includes(f.value)
            return (
              <button
                type="button"
                key={f.value}
                className={`admin-cat-chip admin-feature-chip ${on ? 'active' : ''}`}
                onClick={() => toggleFeature(f.value)}
              >
                {on ? '✓ ' : ''}<Icon name={f.icon} /> {f.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="admin-form-actions">
        <button type="button" className="admin-btn" onClick={onCancel}>Annuler</button>
        <button className="admin-btn admin-btn--primary" disabled={busy || uploading}>
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  )
}
