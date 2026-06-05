export const cars = [
  {
    id: 1,
    name: 'Dacia Logan',
    category: 'economique',
    photo: '/cars-fit/Logan.png',
    brandLogo: '/Dacia-logo.png',
    brandColor: '#0D5FAB',
    whiteFilter: true,
    price: 250,
    currency: 'MAD',
    fuel: 'Diesel',
    transmission: 'Manuel',
    seats: 5,
    extra: 'Clim',
    badge: 'Populaire',
    badgeColor: 'red',
  },
  {
    id: 2,
    name: 'Renault Clio',
    category: 'economique',
    categories: ['economique', 'citadine'],
    photo: '/cars-fit/Clio.png',
    brandLogo: '/Renault-logo.png',
    brandColor: '#1a1a1a',
    whiteFilter: false,
    price: 300,
    currency: 'MAD',
    fuel: 'Essence',
    transmission: 'Manuel',
    seats: 5,
    extra: 'Clim',
    badge: null,
    badgeColor: null,
  },
  {
    id: 3,
    name: 'Peugeot 508',
    category: 'berline',
    photo: '/cars-fit/508_BLEU.png',
    brandLogo: '/Peugeot-logo.png',
    brandColor: '#1A4784',
    whiteFilter: true,
    price: 550,
    currency: 'MAD',
    fuel: 'Diesel',
    transmission: 'Auto',
    seats: 5,
    extra: 'Clim auto',
    badge: 'Nouveau',
    badgeColor: 'blue',
  },
  {
    id: 4,
    name: 'Hyundai Tucson',
    category: 'suv',
    photo: '/cars-fit/New-tucson-1860x540.png',
    brandLogo: null,
    brandColor: '#002C5F',
    whiteFilter: true,
    price: 700,
    currency: 'MAD',
    fuel: 'Diesel',
    transmission: 'Auto',
    seats: 5,
    extra: 'Clim auto',
    badge: null,
    badgeColor: null,
  },
  {
    id: 5,
    name: 'Toyota Land Cruiser',
    category: 'suv',
    photo: '/cars-fit/Toyota Land Cruiser.png',
    brandLogo: '/Toyota-logo-500x281.png',
    brandColor: '#1C1C1C',
    whiteFilter: true,
    price: 1200,
    currency: 'MAD',
    fuel: 'Diesel',
    transmission: 'Auto',
    seats: 7,
    extra: 'Tout terrain',
    badge: 'Top choix',
    badgeColor: 'red',
  },
  {
    id: 6,
    name: 'Mercedes Classe E',
    category: 'luxe',
    photo: '/cars-fit/Class e.png',
    brandLogo: '/mercedes-logo-mercedes-benz-logo-png-transparent-svg-vector-bie-13.png',
    brandColor: '#1A1A1A',
    whiteFilter: false,
    price: 1800,
    currency: 'MAD',
    fuel: 'Essence',
    transmission: 'Auto',
    seats: 5,
    extra: 'Full option',
    badge: 'Prestige',
    badgeColor: 'gold',
  },
]

export const services = [
  {
    icon: 'car',
    title: 'Location Courte Durée',
    description: 'À partir d\'une journée, bénéficiez de tarifs compétitifs avec kilométrage illimité et assurance incluse.',
    features: ['Kilométrage illimité', 'Assurance tous risques', 'Assistance 24h/24'],
    featured: false,
    recommended: true,
  },
  {
    icon: 'calendar',
    title: 'Location Longue Durée',
    description: 'Profitez de tarifs dégressifs pour les locations de plus d\'un mois avec entretien inclus.',
    features: ['Entretien inclus', 'Remplacement en cas de panne', 'Tarifs négociés'],
    featured: false,
  },
  {
    icon: '✈️',
    title: 'Navette Aéroport',
    description: 'Service de navette depuis et vers les principaux aéroports du Maroc, disponible 24h/24.',
    features: ['Accueil personnalisé', 'Suivi des vols', 'Ponctualité garantie'],
    featured: false,
  },
  {
    icon: '💼',
    title: 'Voyage d\'Affaires',
    description: 'Solutions dédiées aux entreprises avec facturation centralisée et flotte premium.',
    features: ['Compte entreprise', 'Facturation mensuelle', 'Véhicules prestige'],
    featured: false,
  },
  {
    icon: '🚐',
    title: 'Location de Minibus',
    description: 'Pour vos événements de groupe, séminaires ou excursions touristiques.',
    features: ['Jusqu\'à 20 passagers', 'Avec ou sans chauffeur', 'Climatisation'],
    featured: false,
  },
  {
    icon: '🛡️',
    title: 'Chauffeur Privé',
    description: 'Voyagez en toute sérénité avec nos chauffeurs expérimentés et discrets.',
    features: ['Chauffeurs certifiés', 'Service VIP', 'Disponibilité immédiate'],
    featured: false,
  },
]

export const steps = [
  { number: '01', icon: '🔍', title: 'Choisissez votre véhicule', description: 'Parcourez notre catalogue et sélectionnez le véhicule qui correspond à vos besoins et votre budget.' },
  { number: '02', icon: '📋', title: 'Faites votre réservation', description: 'Remplissez le formulaire de réservation en ligne ou appelez-nous directement. Confirmation immédiate.' },
  { number: '03', icon: '🔑', title: 'Récupérez les clés', description: 'Présentez-vous à notre agence avec vos documents. Notre équipe vous remet le véhicule prêt à partir.' },
  { number: '04', icon: '🛣️', title: 'Profitez de la route', description: 'Partez l\'esprit tranquille. Notre assistance 24h/24 est disponible tout au long de votre trajet.' },
]

export const testimonials = [
  { id: 1, name: 'Karim Alami', location: 'Casablanca', initials: 'KA', rating: 5, text: '"Service impeccable du début à la fin. Le véhicule était parfaitement propre et en excellent état. Je recommande YASSIR CARS sans hésitation !"', featured: false },
  { id: 2, name: 'Salma Benali', location: 'Directrice commerciale, Rabat', initials: 'SB', rating: 5, text: '"J\'utilise YASSIR CARS pour tous mes déplacements professionnels. Prix compétitifs, flotte récente et équipe très professionnelle. Mon agence de confiance !"', featured: true },
  { id: 3, name: 'Youssef Mansouri', location: 'Marrakech', initials: 'YM', rating: 5, text: '"Réservation en ligne facile, accueil chaleureux à l\'agence. Le Land Cruiser pour notre voyage dans le désert était parfait. Merci YASSIR !"', featured: false },
  { id: 4, name: 'Fatima Oujdi', location: 'Agadir', initials: 'FO', rating: 4, text: '"Très bonne expérience globale. Personnel sympa et véhicule livré à l\'heure à l\'aéroport. Je reviendrai la prochaine fois !"', featured: false },
  { id: 5, name: 'Hassan & Aicha', location: 'Fès', initials: 'HA', rating: 5, text: '"Excellent rapport qualité-prix. La Mercedes Classe E était superbe pour notre mariage. Service digne d\'un 5 étoiles !"', featured: false },
  { id: 6, name: 'Mohamed Kettani', location: 'Tanger', initials: 'MK', rating: 5, text: '"Assistance rapide quand j\'ai eu un petit problème en route. Équipe très réactive. Bravo pour ce professionnalisme exemplaire !"', featured: false },
]

export const brands = [
  { name: 'Renault',    logo: '/Renault-logo.png' },
  { name: 'Mercedes',   logo: '/mercedes-logo-mercedes-benz-logo-png-transparent-svg-vector-bie-13.png' },
  { name: 'BMW',        logo: '/BMW-Logo-500x281.png' },
  { name: 'Toyota',     logo: '/Toyota-logo-500x281.png' },
  { name: 'Dacia',      logo: '/Dacia-logo.png' },
  { name: 'Fiat',       logo: '/Fiat_logo.svg.png' },
  { name: 'Ford',       logo: '/Ford-Logo-500x281.png' },
  { name: 'Mazda',      logo: '/Mazda-Logo-500x281.png' },
  { name: 'Porsche',    logo: '/Porsche-Logo-500x281.png' },
  { name: 'Volkswagen', logo: '/Volkswagen-logo-500x281.png' },
  { name: 'Peugeot',    logo: '/Peugeot-logo.png' },
]

// Moroccan cities for the pick-up location selector (alphabetical).
export const moroccanCities = [
  'Agadir', 'Al Hoceïma', 'Asilah', 'Azrou', 'Béni Mellal', 'Benslimane',
  'Berkane', 'Berrechid', 'Boujdour', 'Casablanca', 'Chefchaouen', 'Dakhla',
  'El Jadida', 'Errachidia', 'Essaouira', 'Fès', 'Fnideq', 'Guelmim',
  'Guercif', 'Ifrane', 'Inezgane', 'Kénitra', 'Khémisset', 'Khénifra',
  'Khouribga', 'Ksar El Kébir', 'Laâyoune', 'Larache', 'Marrakech', 'Martil',
  "M'diq", 'Meknès', 'Midelt', 'Mohammedia', 'Nador', 'Ouarzazate',
  'Ouazzane', 'Oujda', 'Rabat', 'Safi', 'Salé', 'Sefrou', 'Settat',
  'Sidi Kacem', 'Sidi Slimane', 'Skhirat', 'Smara', 'Tan-Tan', 'Tanger',
  'Taourirt', 'Taroudant', 'Taza', 'Témara', 'Tétouan', 'Tinghir', 'Tiznit',
  'Youssoufia', 'Zagora',
]

// Minimum rental length, in days, for all public (non-admin) date pickers.
export const MIN_RENTAL_DAYS = 3

// Add `n` days to an ISO date (YYYY-MM-DD) and return a new ISO date string.
export const addDays = (iso, n) => {
  if (!iso) return ''
  const d = new Date(iso)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

// Palette for the per-unit colour swatch picker (admin) and the
// colour icons shown on the merged public cards.
export const carColors = [
  { name: 'Blanc',  hex: '#f3f4f6' },
  { name: 'Noir',   hex: '#1a1a1a' },
  { name: 'Gris',   hex: '#9ca3af' },
  { name: 'Argent', hex: '#cbd5e1' },
  { name: 'Rouge',  hex: '#dc2626' },
  { name: 'Bleu',   hex: '#2563eb' },
  { name: 'Vert',   hex: '#16a34a' },
  { name: 'Jaune',  hex: '#eab308' },
  { name: 'Orange', hex: '#ea580c' },
  { name: 'Marron', hex: '#78350f' },
  { name: 'Beige',  hex: '#e7d8b1' },
]

export const colorName = (hex) => carColors.find(c => c.hex === hex)?.name ?? hex

export const filterOptions = [
  { value: 'all', label: 'Tous' },
  { value: 'economique', label: 'Économique' },
  { value: 'citadine', label: 'Citadine' },
  { value: 'suv', label: 'SUV / 4x4' },
  { value: 'berline', label: 'Berline' },
  { value: 'luxe', label: 'Luxe' },
]

// A car belongs to a category if it's in its `categories` list,
// or (fallback) matches its single `category`. Lets one car appear
// under several filters (e.g. the Clio is économique + citadine).
export const carInCategory = (car, key) =>
  (car.categories ?? [car.category]).includes(key)
