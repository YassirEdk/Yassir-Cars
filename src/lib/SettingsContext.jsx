import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { fetchSettings, DEFAULT_SETTINGS } from './settings'

const SettingsContext = createContext({ settings: DEFAULT_SETTINGS, reload: () => {} })

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)

  const reload = useCallback(async () => {
    setSettings(await fetchSettings())
  }, [])

  useEffect(() => { reload() }, [reload])

  return (
    <SettingsContext.Provider value={{ settings, reload }}>
      {children}
    </SettingsContext.Provider>
  )
}

// Hook used across the public site. Always returns a usable settings object.
export function useSettings() {
  return useContext(SettingsContext)
}
