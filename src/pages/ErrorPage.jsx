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

export default function ErrorPage({ code = 404 }) {
  const preset = PRESETS[code] ?? PRESETS[404]

  useEffect(() => {
    const prev = document.title
    document.title = `${code} — ${preset.title} · Yassir Cars`
    return () => { document.title = prev }
  }, [code, preset.title])

  return (
    <>
      <Navbar />
      <main className="error-page">
        <div className="error-shell">
          <div className="error-code" aria-hidden="true">{code}</div>
          <h1 className="error-title">{preset.title}</h1>
          <p className="error-tagline">{preset.tagline}</p>
          <p className="error-message">{preset.message}</p>
          <div className="error-actions">
            <Link to="/" className="btn btn-primary">
              <span aria-hidden="true">←</span> Retour à l’accueil
            </Link>
            <Link to="/flotte" className="btn btn-white">
              Voir la flotte <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
