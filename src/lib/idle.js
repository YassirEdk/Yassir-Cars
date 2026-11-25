/* Runs `fn` once the page has loaded and the browser has nothing better to do —
   for fetching what the visitor will probably need next. Skipped when they asked
   to save data or are on a 2G connection. Returns a cancel function. */
export function whenIdle(fn) {
  const conn = navigator.connection
  if (conn?.saveData || /2g/.test(conn?.effectiveType ?? '')) return () => {}

  const hasIdle = 'requestIdleCallback' in window
  let handle = 0
  const schedule = () => {
    handle = hasIdle ? window.requestIdleCallback(fn, { timeout: 4000 }) : window.setTimeout(fn, 1500)
  }

  if (document.readyState === 'complete') schedule()
  else window.addEventListener('load', schedule, { once: true })

  return () => {
    window.removeEventListener('load', schedule)
    if (hasIdle) window.cancelIdleCallback(handle)
    else window.clearTimeout(handle)
  }
}
