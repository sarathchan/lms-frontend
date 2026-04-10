import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'mylms-theme'

function readDark(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

function subscribe(onStoreChange: () => void) {
  const el = document.documentElement
  const obs = new MutationObserver(onStoreChange)
  obs.observe(el, { attributes: true, attributeFilter: ['class'] })
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onStoreChange()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    obs.disconnect()
    window.removeEventListener('storage', onStorage)
  }
}

/**
 * Theme synced with <html class="dark"> and localStorage (mylms-theme).
 * Inline script in index.html prevents flash before React loads.
 */
export function useTheme() {
  const isDark = useSyncExternalStore(subscribe, readDark, () => false)

  const setDark = useCallback((next: boolean) => {
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
    } catch {
      /* ignore */
    }
  }, [])

  const toggle = useCallback(() => {
    setDark(!readDark())
  }, [setDark])

  return {
    isDark,
    setDark,
    toggle,
    resolvedTheme: isDark ? ('dark' as const) : ('light' as const),
  }
}
