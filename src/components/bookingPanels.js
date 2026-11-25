import { deferred } from '../lib/deferred'
import { whenIdle } from '../lib/idle'

/* The two panels a car card opens: the availability popup and the booking side
   panel. Most visits never open them, so their code and CSS (with the city
   picker's) stay out of the first download and arrive once the page is idle. */
export const AvailabilityModal = deferred(() => import('./AvailabilityModal'))
export const ReserveDrawer = deferred(() => import('./ReserveDrawer'))

export function preloadBookingPanels() {
  AvailabilityModal.preload()
  ReserveDrawer.preload()
}

// Once per visit, from the first page that shows car cards.
let warming = false
export function warmBookingPanels() {
  if (warming) return
  warming = true
  whenIdle(preloadBookingPanels)
}
