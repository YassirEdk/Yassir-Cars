import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { SettingsProvider } from './lib/SettingsContext'
import { CurrencyProvider } from './lib/CurrencyContext'

// Block native image dragging across the whole site (cross-browser, incl. Firefox).
// Only cancels when the dragged element is an <img>, so the admin's drag-to-reorder
// handles and photo-thumbnail reordering (which drag <div>s) keep working.
document.addEventListener('dragstart', (e) => {
  if (e.target?.tagName === 'IMG') e.preventDefault()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <CurrencyProvider>
          <App />
        </CurrencyProvider>
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>,
)
