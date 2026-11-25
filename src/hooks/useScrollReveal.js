import { useEffect, useRef } from 'react'

const MS = 650

/* Fades an element in as it scrolls into view, `delay` ms after its neighbours:
   the cards of a row come in one after the other. */
export function useScrollReveal(delay = 0) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    el.style.opacity = '0'
    el.style.transform = 'translateY(24px)'
    el.style.transition = `opacity ${MS}ms ease ${delay}ms, transform ${MS}ms cubic-bezier(.2,.75,.25,1) ${delay}ms`

    let timer = 0
    const clear = () => {
      for (const p of ['opacity', 'transform', 'transition']) el.style.removeProperty(p)
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        el.style.opacity = '1'
        el.style.transform = 'none'
        // Hand the element back to the stylesheet (hover effects included).
        timer = setTimeout(clear, MS + delay + 50)
      },
      { threshold: 0.1 }
    )

    observer.observe(el)
    return () => { observer.disconnect(); clearTimeout(timer); clear() }
  }, [delay])

  return ref
}
