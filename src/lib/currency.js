// Display-only currency conversion for the results page. Prices are stored in
// MAD. Each entry's `rate` (units of the currency per 1 MAD) is only a FALLBACK
// used until the live rates load — see setLiveRates / CurrencyContext.
export const CURRENCIES = {
  MAD: { code: 'MAD', label: 'MAD', symbol: 'MAD', rate: 1,     suffix: true  },
  EUR: { code: 'EUR', label: 'EUR', symbol: '€',   rate: 0.093, suffix: false },
  USD: { code: 'USD', label: 'USD', symbol: '$',   rate: 0.108, suffix: false },
}

export const CURRENCY_CODES = ['MAD', 'EUR', 'USD']

// Live rates (units per 1 MAD) fetched at runtime from an exchange-rate API.
// Until they arrive (or if the call fails) we fall back to CURRENCIES[code].rate.
let liveRates = {}
export function setLiveRates(rates) { liveRates = rates || {} }

function rateFor(code) {
  return liveRates[code] ?? CURRENCIES[code]?.rate ?? 1
}

// MAD amount → integer amount in the chosen currency.
// Rounding rule: keep the whole part when the decimals are tiny (< 0.10), round
// up otherwise. So 19.03 → 19, but 18.90 → 19 and 16.36 → 17.
export function convert(mad, code) {
  const v = Number(mad || 0) * rateFor(code)
  const whole = Math.floor(v)
  return (v - whole) < 0.1 ? whole : whole + 1
}

// MAD amount → formatted string with the currency symbol (e.g. "1 750 MAD", "€163", "$175").
export function formatMoney(mad, code) {
  const c = CURRENCIES[code] ?? CURRENCIES.MAD
  const v = convert(mad, code).toLocaleString('fr-FR')
  return c.suffix ? `${v} ${c.symbol}` : `${c.symbol}${v}`
}
