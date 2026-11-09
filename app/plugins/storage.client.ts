import { NOTE_PREFIX } from '../domain/storage'
import { useNotesStore } from '../stores/notes'

export default defineNuxtPlugin((nuxtApp) => {
  const store = useNotesStore()
  try {
    store.initialize(window.localStorage)
  } catch {
    store.failStorage()
  }
  const onStorage = (event: StorageEvent): void => {
    if (
      event.storageArea === window.localStorage &&
      (event.key === null || event.key.startsWith(NOTE_PREFIX))
    )
      store.sync()
  }
  window.addEventListener('storage', onStorage)
  nuxtApp.hook('app:beforeMount', () => store.sync())
  if (import.meta.hot)
    import.meta.hot.dispose(() => window.removeEventListener('storage', onStorage))
})
