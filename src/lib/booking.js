/* The booking request, shared by the side panel and the booking page: what must be
   filled in, what it costs, and the message handed to WhatsApp. */
import { addDays } from '../data'
import { formatMoney } from './currency'

const today = () => new Date().toISOString().slice(0, 10)
const frDate = (iso) => (iso ? iso.split('-').reverse().join('/') : '')

export const jours = (n) => `${n} jour${n > 1 ? 's' : ''}`

// Null until both dates are there and in the right order.
export function bookingDays(depart, retour) {
  if (!depart || !retour) return null
  const diff = (new Date(retour) - new Date(depart)) / 86_400_000
  return diff > 0 ? Math.ceil(diff) : null
}

/* What is missing or wrong, by field, in the order of the form. Empty when the
   request can be sent. The agency needs all of it to answer. */
export function bookingErrors(form, minDays) {
  const errors = {}
  if (!form.fullName.trim()) errors.fullName = 'Entrez votre nom complet'
  if (!form.lieu) errors.lieu = 'Choisissez le lieu de prise en charge'
  if (!form.depart) errors.depart = 'Choisissez la date de départ'
  // A booking page left open, or an old link.
  else if (form.depart < today()) errors.depart = 'Cette date est déjà passée'
  if (!form.retour) errors.retour = 'Choisissez la date de retour'
  else if (form.depart && form.retour < addDays(form.depart, minDays)) errors.retour = `Au moins ${jours(minDays)} de location`
  return errors
}

/* Takes the visitor to the first field in error inside `root`, as it reads on screen.
   Fields are marked with `data-field`. */
export function focusField(root, errors) {
  const field = [...(root?.querySelectorAll('[data-field]') ?? [])].find(el => errors[el.dataset.field])
  if (!field) return
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  field.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' })
  field.querySelector('input, select')?.focus({ preventScroll: true })
}

/* Every line is conditional: a missing value drops its whole line rather than
   sending "Lieu : " or "Durée : null jours" to the agency. */
export function bookingMessage({ carName, color, form, dayPrice, currency }) {
  const days = bookingDays(form.depart, form.retour)
  const total = dayPrice && days ? dayPrice * days : 0
  return [
    `Bonjour YASSIR CARS`,
    ``,
    `Je souhaite réserver le véhicule suivant :`,
    `Voiture : *${carName}*${color ? ` — ${color}` : ''}`,
    ``,
    `Nom complet : ${form.fullName.trim()}`,
    form.lieu   ? `Lieu : ${form.lieu}` : '',
    form.lieuRetour && form.lieuRetour !== form.lieu ? `Lieu de retour : ${form.lieuRetour}` : '',
    form.depart ? `Date de début : ${frDate(form.depart)}` : '',
    form.retour ? `Date de fin : ${frDate(form.retour)}` : '',
    days        ? `Durée : ${jours(days)}` : '',
    total
      ? `Prix estimé : ${formatMoney(total, currency)}${currency !== 'MAD' ? ` (≈ ${total.toLocaleString('fr-FR')} MAD)` : ''}`
      : '',
    ``,
    `Merci !`,
  ].filter(Boolean).join('\n')
}
