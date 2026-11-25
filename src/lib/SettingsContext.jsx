import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { fetchSettings, DEFAULT_SETTINGS } from './settings'

const SettingsContext = createContext({ settings: DEFAULT_SETTINGS, status: 'loading', reload: () => {} })

// Without the settings nobody can send a request, so a failed read is retried.
const RETRY_MS = [2_000, 5_000, 15_000]

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)

  const [status, setStatus] = useState('loading')   // 'loading' | 'ready' | 'error'

  // Resolves to true on success. On failure the last good settings are kept.
  const reload = useCallback(async () => {
    try {
      const next = await fetchSettings()
      setSettings(next)
      setStatus('ready')
      return true
    } catch (err) {
      console.error('Settings could not be loaded:', err.message)
      setStatus(s => (s === 'ready' ? s : 'error'))
      return false
    }
  }, [])

  useEffect(() => {
    let alive = true
    let timer = 0
    const attempt = async (n) => {
      const ok = await reload()
      if (!ok && alive && n < RETRY_MS.length) timer = setTimeout(() => attempt(n + 1), RETRY_MS[n])
    }
    attempt(0)
    return () => { alive = false; clearTimeout(timer) }
  }, [reload])

  return (
    <SettingsContext.Provider value={{ settings, status, reload }}>
      {children}
    </SettingsContext.Provider>
  )
}

// Hook used across the public site. Always returns a usable settings object.
export function useSettings() {
  return useContext(SettingsContext)
}
