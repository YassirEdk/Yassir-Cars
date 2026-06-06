import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { CURRENCY_CODES, setLiveRates } from './currency'

const KEY = 'yc_currency'
const RATES_KEY = 'yc_rates'
const RATES_TTL = 12 * 60 * 60 * 1000          // refresh rates at most every 12h
const RATES_URL = 'https://open.er-api.com/v6/latest/MAD'

const CurrencyContext = createContext({ currency: 'MAD', setCurrency: () => {}, rates: null })

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => {
    try {
      const s = localStorage.getItem(KEY)
      if (s && CURRENCY_CODES.includes(s)) return s
    } catch { /* storage blocked */ }
    return 'MAD'
  })
  const [rates, setRates] = useState(null)

  const setCurrency = useCallback((c) => {
    setCurrencyState(c)
    try { localStorage.setItem(KEY, c) } catch { /* storage blocked */ }
  }, [])

  // Load live MAD→* exchange rates. Use the cached copy first (so prices are
  // right immediately on reload), then refresh from the API if it's stale.
  useEffect(() => {
    let cached = null
    try { cached = JSON.parse(localStorage.getItem(RATES_KEY) || 'null') } catch { /* bad JSON */ }
    if (cached?.rates) { setLiveRates(cached.rates); setRates(cached.rates) }

    if (cached?.rates && Date.now() - cached.ts < RATES_TTL) return  // still fresh

    fetch(RATES_URL)
      .then(r => r.json())
      .then(d => {
        if (d?.result === 'success' && d.rates) {
          setLiveRates(d.rates)
          setRates(d.rates)
          try { localStorage.setItem(RATES_KEY, JSON.stringify({ ts: Date.now(), rates: d.rates })) } catch { /* storage blocked */ }
        }
      })
      .catch(() => { /* keep cached / fallback rates */ })
  }, [])

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}
