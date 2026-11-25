import { useEffect } from 'react'

const DEFAULT_TITLE = 'YASSIR CARS — Location de Voitures'

// Page title, put back when the visitor leaves the page.
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title || DEFAULT_TITLE
    return () => { document.title = DEFAULT_TITLE }
  }, [title])
}
