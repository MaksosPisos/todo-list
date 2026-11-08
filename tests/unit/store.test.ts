import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNotesStore } from '../../app/stores/notes'
import { NOTE_PREFIX, NotesRepository } from '../../app/domain/storage'
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
})
