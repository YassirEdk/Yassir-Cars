import { useState } from 'react'
import { brands } from '../data'

function BrandLogo({ brand }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="brand-logo-box">
      {!failed ? (
        <img
          src={brand.logo}
          alt={brand.name}
          className="brand-logo"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="brand-text-fallback">{brand.name}</span>
      )}
    </div>
  )
}

export default function Brands() {
  // 4 copies → always fills any viewport width, guarantees seamless loop
  const repeated = [...brands, ...brands, ...brands, ...brands]
  return (
    <section className="brands-band">
      <div className="brands-track">
        <div className="brands-slide">
          {repeated.map((b, i) => <BrandLogo key={i} brand={b} />)}
        </div>
      </div>
    </section>
  )
}
