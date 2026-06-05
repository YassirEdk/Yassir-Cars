import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Home from './pages/Home'
import SearchResults from './pages/SearchResults'
import AllCars from './pages/AllCars'
import Admin from './pages/Admin'
import Reserver from './pages/Reserver'

export default function App() {
  // Intercept all hash-anchor clicks so the URL never shows #section
  useEffect(() => {
    const handler = (e) => {
      const a = e.target.closest('a[href^="#"]')
      if (!a) return
      e.preventDefault()
      const id = a.getAttribute('href').slice(1)
      if (!id) return
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const location = useLocation()

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      {/* key={location.search} forces a full remount when search params change */}
      <Route path="/resultats" element={<SearchResults key={location.search} />} />
      <Route path="/flotte" element={<AllCars />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/reserver" element={<Reserver />} />
    </Routes>
  )
}
