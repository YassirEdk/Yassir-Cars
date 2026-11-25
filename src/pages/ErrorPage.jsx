import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import SplitNotice, { Back, Onward } from '../components/SplitNotice'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

const PRESETS = {
  404: {
    title: 'Page introuvable',
    tagline: 'Cette page a pris la mauvaise sortie.',
    message: 'La page que vous cherchez n’existe pas ou a été déplacée. Reprenons la route depuis l’accueil.',
  },
  403: {
    title: 'Accès refusé',
    tagline: 'Vous n’avez pas les clés de cette porte.',
    message: 'Cette section est réservée. Si vous pensez qu’il s’agit d’une erreur, contactez-nous.',
  },
  405: {
    title: 'Méthode non autorisée',
    tagline: 'Mauvaise manœuvre.',
    message: 'L’action demandée n’est pas autorisée sur cette ressource. Essayez à nouveau depuis l’accueil.',
  },
}

export default function ErrorPage({ code = 404 }) {
  const preset = PRESETS[code] ?? PRESETS[404]
  useDocumentTitle(`${code} — ${preset.title} | YASSIR CARS`)

  return (
    <>
      <Navbar minimal />
      <SplitNotice code={code} {...preset}>
        <Link to="/" className="error-btn error-btn--primary"><Back>Retour à l’accueil</Back></Link>
        <Link to="/flotte" className="error-btn error-btn--ghost"><Onward>Voir la flotte</Onward></Link>
      </SplitNotice>
      <Footer />
    </>
  )
}
