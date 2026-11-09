import type { Theme } from '../composables/useTheme'

const STORAGE_KEY = 'quiet-notes:theme'

export default defineNuxtPlugin((nuxtApp) => {
  const theme = useState<Theme>('theme', () => 'light')
  const system = window.matchMedia('(prefers-color-scheme: dark)')
  let preference: Theme | null = null
  let syncing = false

  function readPreference(): Theme | null {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY)
      return value === 'light' || value === 'dark' ? value : null
    } catch {
      return null
    }
  }

  function applyTheme(): void {
    syncing = true
    theme.value = preference ?? (system.matches ? 'dark' : 'light')
    document.documentElement.dataset.theme = theme.value
    syncing = false
  }

  preference = readPreference()
  applyTheme()

  const stop = watch(
    theme,
    (value) => {
      document.documentElement.dataset.theme = value
      if (syncing) return
      preference = value
      try {
        window.localStorage.setItem(STORAGE_KEY, value)
      } catch {
        // The switch remains usable when browser storage is unavailable.
      }
    },
    { flush: 'sync' },
  )

  function onSystemChange(): void {
    if (preference === null) applyTheme()
  }

  function onStorage(event: StorageEvent): void {
    if (event.key === STORAGE_KEY || event.key === null) {
      preference = readPreference()
      applyTheme()
    }
  }

  system.addEventListener('change', onSystemChange)
  window.addEventListener('storage', onStorage)

  function cleanup(): void {
    stop()
    system.removeEventListener('change', onSystemChange)
    window.removeEventListener('storage', onStorage)
  }

  nuxtApp.vueApp.onUnmount(cleanup)
  if (import.meta.hot) import.meta.hot.dispose(cleanup)
})
