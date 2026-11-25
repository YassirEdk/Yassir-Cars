import { createElement, useEffect, useState } from 'react'

/* A component whose code is downloaded the first time it is shown: for panels
   that open on a click most visits never make. `preload()` fetches it ahead of
   time (when the page is idle), so the click finds it ready.

   Not React.lazy: that keeps a failed download for good and throws it at the
   nearest error boundary, which here is the whole page. This renders nothing
   until the code is in; if it can't be fetched it calls the panel's `onClose`,
   and the next opening tries again. */
export function deferred(load) {
  let Loaded = null
  let pending = null

  const fetchIt = () => {
    if (!pending) {
      pending = load().then(
        (mod) => (Loaded = mod.default),
        (err) => { pending = null; throw err },
      )
    }
    return pending
  }

  function Deferred(props) {
    const [Component, setComponent] = useState(() => Loaded)

    useEffect(() => {
      if (Component) return
      let alive = true
      fetchIt().then(
        (C) => { if (alive) setComponent(() => C) },
        () => { if (alive) props.onClose?.() },
      )
      return () => { alive = false }
    }, [])   // eslint-disable-line react-hooks/exhaustive-deps

    return Component ? createElement(Component, props) : null
  }

  // Ahead of time, a failure is no one's business: the opening will retry.
  Deferred.preload = () => fetchIt().catch(() => {})
  return Deferred
}
