import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const PRESETS = {
  404: {
    title: 'Page introuvable',
    tagline: 'Cette page a pris la mauvaise sortie.',
    message: "La page que vous cherchez n'existe pas ou a été déplacée. Reprenons la route depuis l'accueil.",
  },
  403: {
    title: 'Accès refusé',
    tagline: 'Vous n’avez pas les clés de cette porte.',
    message: "Cette section est réservée. Si vous pensez qu'il s'agit d'une erreur, contactez-nous.",
  },
  405: {
    title: 'Méthode non autorisée',
    tagline: 'Mauvaise manœuvre.',
    message: "L'action demandée n'est pas autorisée sur cette ressource. Essayez à nouveau depuis l'accueil.",
  },
}

function Arrow({ back = false }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
      strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"
      style={back ? { transform: 'scaleX(-1)' } : undefined} focusable="false">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export default function ErrorPage({ code = 404 }) {
  const preset = PRESETS[code] ?? PRESETS[404]

  useEffect(() => {
    const prev = document.title
    document.title = `${code} — ${preset.title} · Yassir Cars`
    return () => { document.title = prev }
  }, [code, preset.title])

  return (
    <>
      <Navbar minimal />
      <main className="error-page">
        <div className="error-shell">
          <div className="error-code" aria-hidden="true">{code}</div>
          <h1 className="error-title">{preset.title}</h1>
          <p className="error-tagline">{preset.tagline}</p>
          <p className="error-message">{preset.message}</p>
          <div className="error-actions">
            <Link to="/" className="error-btn error-btn--primary">
              <span className="error-btn__arrow error-btn__arrow--back" aria-hidden="true"><Arrow back /></span>
              Retour à l’accueil
            </Link>
            <Link to="/flotte" className="error-btn error-btn--ghost">
              Voir la flotte
              <span className="error-btn__arrow" aria-hidden="true"><Arrow /></span>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
