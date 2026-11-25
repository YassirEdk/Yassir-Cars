import { useEffect, useState } from 'react'
import { brands } from '../data'
import { fetchCars } from '../lib/cars'

function BrandLogo({ brand }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="brand-logo-box">
      {!failed ? (
        <img
          src={brand.logo}
          alt=""
          className="brand-logo"
          width="96"
          height="42"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="brand-text-fallback">{brand.name}</span>
      )}
    </div>
  )
}

const BOX = 122            // narrowest .brand-logo-box
const WIDEST = 2560        // screens the loop must cover

/* Logos of the brands that can actually be rented: a car joining the fleet
   brings its logo in, the last one leaving takes it out. */
export default function Brands() {
  const [names, setNames] = useState([])
  useEffect(() => {
    let alive = true
    fetchCars()
      .then(list => { if (alive) setNames(list.map(c => c.name.toLowerCase())) })
      .catch(() => { /* no logos */ })
    return () => { alive = false }
  }, [])

  const rented = brands.filter(b => names.some(n => n.startsWith(b.name.toLowerCase())))
  // Enough copies that one can scroll away without leaving a gap.
  const copies = rented.length ? Math.ceil(WIDEST / (rented.length * BOX)) + 1 : 0

  return (
    <section className="brands-band" id="marques" aria-label="Les marques de notre flotte">
      <div className="container brands-inner">
        <p className="brands-label">Les marques de notre flotte</p>
        {rented.length > 0 && <p className="sr-only">{rented.map(b => b.name).join(', ')}</p>}
        <div className="brands-track" aria-hidden="true">
          <div
            className="brands-slide"
            style={{ '--shift': `-${100 / (copies || 1)}%`, '--time': `${rented.length * 3}s` }}
          >
            {Array.from({ length: copies }, (_, c) => rented.map(b => <BrandLogo key={`${b.name}-${c}`} brand={b} />))}
          </div>
        </div>
      </div>
    </section>
  )
}
