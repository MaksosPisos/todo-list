import { useNotesStore } from '../stores/notes'

export default defineNuxtPlugin(() => {
  const store = useNotesStore()
  try {
    store.initialize(window.localStorage)
  } catch {
    store.failStorage()
  }
})
