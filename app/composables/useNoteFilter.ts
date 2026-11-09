export type NoteFilter = 'all' | 'active' | 'done'

export function useNoteFilter() {
  const route = useRoute()
  const router = useRouter()
  const filter = computed<NoteFilter>({
    get: () =>
      route.query.filter === 'active' || route.query.filter === 'done' ? route.query.filter : 'all',
    set: (value) => {
      void router.replace({ path: '/', query: value === 'all' ? {} : { filter: value } })
    },
  })
  return filter
}
