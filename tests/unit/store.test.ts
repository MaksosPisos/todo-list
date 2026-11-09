import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNotesStore } from '../../app/stores/notes'
import {
  DRAFT_PREFIX,
  NOTE_PREFIX,
  NotesRepository,
  readDraft,
  saveDraft,
} from '../../app/domain/storage'
import { MemoryStorage, makeNote } from './helpers'

describe('notes store and manual persistence', () => {
  beforeEach(() => setActivePinia(createPinia()))
  it('writes only on explicit save and persists the schema and normalized data', () => {
    const storage = new MemoryStorage()
    const store = useNotesStore()
    store.initialize(storage)
    expect(storage.writes).toBe(0)
    const content = { title: '   ', todos: [{ id: 't1', text: ' Шаг ', done: false }] }
    expect(store.save('n1', content, null)).toBe('saved')
    expect(storage.writes).toBe(1)
    expect(JSON.parse(storage.getItem(NOTE_PREFIX + 'n1')!)).toMatchObject({
      version: 1,
      note: { title: 'Без названия', todos: [{ text: 'Шаг' }] },
    })
    expect(content.todos[0]?.text).toBe(' Шаг ')
    const reloaded = useNotesStore(createPinia())
    reloaded.initialize(storage)
    expect(reloaded.notes).toEqual(store.notes)
    expect(storage.writes).toBe(1)
  })
  it('rejects empty tasks without writing', () => {
    const storage = new MemoryStorage()
    const store = useNotesStore()
    store.initialize(storage)
    expect(
      store.save('n1', { title: 'A', todos: [{ id: 't1', text: '  ', done: false }] }, null),
    ).toBe('error')
    expect(storage.writes).toBe(0)
  })
  it('does not expose saved data to accidental draft mutation', () => {
    const storage = new MemoryStorage()
    const store = useNotesStore()
    store.initialize(storage)
    const content = makeNote()
    store.save('n1', content, null)
    content.todos[0]!.text = 'not saved'
    expect(store.notes[0]?.todos[0]?.text).toBe('Начать')
  })
  it('syncs deletion across tabs and prevents resurrection on stale save', () => {
    const storage = new MemoryStorage()
    const first = useNotesStore(createPinia())
    const second = useNotesStore(createPinia())
    first.initialize(storage)
    second.initialize(storage)
    first.save('n1', makeNote(), null)
    second.sync()
    const revision = second.notes[0]!.revision
    first.remove('n1')
    second.sync()
    expect(second.notes).toEqual([])
    expect(second.save('n1', makeNote(), revision)).toBe('missing')
    expect(storage.getItem(NOTE_PREFIX + 'n1')).toBe(null)
  })
  it('preserves unrelated notes when a stale tab saves another note', () => {
    const storage = new MemoryStorage()
    const first = useNotesStore(createPinia())
    const second = useNotesStore(createPinia())
    first.initialize(storage)
    second.initialize(storage)
    first.save('n1', makeNote(), null)
    second.save('n2', makeNote('n2'), null)
    first.sync()
    expect(first.notes.map((note) => note.id).sort()).toEqual(['n1', 'n2'])
  })
  it('rejects a conflicting revision without overwriting the newer note', () => {
    const storage = new MemoryStorage()
    const repository = new NotesRepository(storage)
    repository.save(makeNote(), null)
    repository.save({ ...makeNote(), title: 'Newer', revision: 'r2' }, 'r1')
    expect(repository.save({ ...makeNote(), title: 'Stale' }, 'r1')).toBe('conflict')
    expect(repository.load().notes[0]?.title).toBe('Newer')
  })
  it('keeps unsupported and corrupt records untouched and loads healthy records', () => {
    const storage = new MemoryStorage()
    new NotesRepository(storage).save(makeNote(), null)
    storage.setItem(NOTE_PREFIX + 'broken', '{broken')
    storage.setItem(
      NOTE_PREFIX + 'future',
      JSON.stringify({ version: 2, note: makeNote('future') }),
    )
    const store = useNotesStore()
    store.initialize(storage)
    expect(store.notes).toHaveLength(1)
    expect(store.warning).toContain('повреждена')
    expect(storage.getItem(NOTE_PREFIX + 'broken')).toBe('{broken')
    expect(storage.writes).toBe(3)
  })
  it('reports unavailable storage and failed writes without changing state', () => {
    const store = useNotesStore()
    const storage = new MemoryStorage()
    storage.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    store.initialize(storage)
    expect(store.save('n1', makeNote(), null)).toBe('error')
    expect(store.notes).toEqual([])
    expect(store.warning).toContain('Не удалось сохранить')
    store.failStorage()
    expect(store.ready).toBe(true)
  })
  it('round-trips a versioned draft independently of the committed note', () => {
    const storage = new MemoryStorage()
    saveDraft(storage, 'n1', makeNote(), 'r1')
    expect(readDraft(storage, 'n1')).toMatchObject({
      version: 1,
      baseRevision: 'r1',
      note: { id: 'n1', title: 'Планы', todos: makeNote().todos },
    })
  })
  it('validates draft schema and treats an absent draft as empty', () => {
    const storage = new MemoryStorage()
    expect(readDraft(storage, 'n1')).toBe(null)
    storage.setItem(DRAFT_PREFIX + 'n1', JSON.stringify({ version: 2, note: makeNote() }))
    expect(() => readDraft(storage, 'n1')).toThrow()
  })
})
