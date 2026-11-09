import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, type EffectScope } from 'vue'
import { useNoteEditor } from '../../app/composables/useNoteEditor'
import { DRAFT_PREFIX, readDraft } from '../../app/domain/storage'
import { MemoryStorage } from './helpers'

const { cleanups } = vi.hoisted(() => ({ cleanups: [] as (() => void)[] }))
vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue')>()
  return { ...actual, onBeforeUnmount: (callback: () => void) => cleanups.push(callback) }
})

describe('editor session: grouping, shortcuts commands and draft scheduling', () => {
  let storage: MemoryStorage
  let scope: EffectScope
  beforeEach(() => {
    vi.useFakeTimers()
    storage = new MemoryStorage()
    const windowEvents = new EventTarget()
    vi.stubGlobal('window', {
      sessionStorage: storage,
      addEventListener: windowEvents.addEventListener.bind(windowEvents),
      removeEventListener: windowEvents.removeEventListener.bind(windowEvents),
    })
    vi.stubGlobal('document', new EventTarget())
    scope = effectScope()
  })
  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup())
    scope.stop()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })
  function editor() {
    return scope.run(() =>
      useNoteEditor(
        'n1',
        { title: 'Start', todos: [{ id: 't1', text: 'Task', done: false }] },
        'r1',
      ),
    )!
  }
  it('coalesces typing until blur, and restores the whole input in one undo', () => {
    const edit = editor()
    edit.updateText('title', 'S')
    edit.updateText('title', 'Some')
    edit.updateText('title', 'Something')
    edit.flushText()
    edit.undo()
    expect(edit.content.value.title).toBe('Start')
    expect(edit.canUndo.value).toBe(false)
    edit.redo()
    expect(edit.content.value.title).toBe('Something')
  })
  it('commits typing on idle and makes a later burst another operation', async () => {
    const edit = editor()
    edit.updateText('title', 'First')
    await vi.advanceTimersByTimeAsync(651)
    edit.updateText('title', 'Second')
    edit.undo()
    expect(edit.content.value.title).toBe('First')
    edit.undo()
    expect(edit.content.value.title).toBe('Start')
  })
  it('flushes the previous field before switching fields', () => {
    const edit = editor()
    edit.updateText('title', 'Changed')
    edit.updateText('text', 'Changed task', 't1')
    edit.undo()
    expect(edit.content.value.todos[0]?.text).toBe('Task')
    expect(edit.content.value.title).toBe('Changed')
    edit.undo()
    expect(edit.content.value.title).toBe('Start')
  })
  it('keeps toggles and insertion/deletion atomic relative to pending text', () => {
    const edit = editor()
    edit.updateText('text', 'Edited', 't1')
    edit.toggleTodo('t1')
    edit.undo()
    expect(edit.content.value.todos[0]).toMatchObject({ text: 'Edited', done: false })
    edit.undo()
    expect(edit.content.value.todos[0]?.text).toBe('Task')
    const id = edit.addTodo()
    edit.updateText('text', 'New task', id)
    edit.removeTodo(id)
    edit.undo()
    expect(edit.content.value.todos[1]?.text).toBe('New task')
    edit.undo()
    expect(edit.content.value.todos[1]?.text).toBe('')
    edit.undo()
    expect(edit.content.value.todos).toHaveLength(1)
  })
  it('clears redo on a new text operation and disables it while typing', () => {
    const edit = editor()
    edit.updateText('title', 'A')
    edit.undo()
    expect(edit.canRedo.value).toBe(true)
    edit.updateText('title', 'B')
    expect(edit.canRedo.value).toBe(false)
    edit.flushText()
    edit.redo()
    expect(edit.content.value.title).toBe('B')
  })
  it('debounces drafts and includes the latest text even before blur', async () => {
    const edit = editor()
    edit.updateText('title', 'A')
    await nextTick()
    await vi.advanceTimersByTimeAsync(400)
    expect(storage.writes).toBe(0)
    edit.updateText('title', 'AB')
    await nextTick()
    await vi.advanceTimersByTimeAsync(799)
    expect(storage.writes).toBe(0)
    await vi.advanceTimersByTimeAsync(1)
    expect(storage.writes).toBe(1)
    expect(readDraft(storage, 'n1')?.note.title).toBe('AB')
    expect(readDraft(storage, 'n1')?.baseRevision).toBe('r1')
  })
  it('restores the draft, then clears history and draft on finish', async () => {
    const edit = editor()
    edit.updateText('title', 'Draft')
    await nextTick()
    await vi.advanceTimersByTimeAsync(900)
    const draft = edit.getDraft()!
    const restored = editor()
    restored.restore(draft)
    expect(restored.content.value.title).toBe('Draft')
    expect(restored.dirty.value).toBe(true)
    expect(restored.canUndo.value).toBe(false)
    restored.updateText('title', 'Final')
    restored.finish()
    await nextTick()
    await vi.advanceTimersByTimeAsync(2000)
    expect(restored.canUndo.value).toBe(false)
    expect(restored.canRedo.value).toBe(false)
    expect(storage.getItem(DRAFT_PREFIX + 'n1')).toBe(null)
  })
  it('removes the draft when undo returns exactly to the saved state', async () => {
    const edit = editor()
    edit.toggleTodo('t1')
    await nextTick()
    await vi.advanceTimersByTimeAsync(900)
    expect(storage.getItem(DRAFT_PREFIX + 'n1')).not.toBe(null)
    edit.undo()
    await nextTick()
    await vi.advanceTimersByTimeAsync(900)
    expect(edit.dirty.value).toBe(false)
    expect(storage.getItem(DRAFT_PREFIX + 'n1')).toBe(null)
  })
})
