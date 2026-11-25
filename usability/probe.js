/* Run in the page after every step; the person never sees it. It notes which
   WhatsApp message the site prepared, since none of them may really be sent. */
() => {
  const box = (window.__foveal ||= { sent: [] })
  if (!box.on) {
    box.on = true
    const note = (url) => {
      const u = String(url ?? '')
      if (/wa\.me|whatsapp/.test(u)) box.sent.push(new URL(u).searchParams.get('text') ?? '')
    }
    const open = window.open
    window.open = (url, ...rest) => { note(url); return open.call(window, url, ...rest) }
    addEventListener('click', (e) => note(e.target.closest?.('a[href*="wa.me"]')?.href), true)
  }
  const message = box.sent.filter(t => t.includes('Je souhaite réserver le véhicule')).pop() ?? ''
  const line = (name) => message.match(new RegExp(`^${name} : (.*)$`, 'm'))?.[1] ?? ''
  return {
    path: location.pathname,
    searched: location.pathname === '/resultats',
    form_open: !!document.querySelector('.rd-top') || location.pathname === '/reserver',
    sent: !!message,
    car: line('Voiture'),
    pickup: line('Lieu'),
    dropoff: line('Lieu de retour'),
    start: line('Date de début'),
    end: line('Date de fin'),
    whatsapp_clicks: box.sent.length,
  }
}
