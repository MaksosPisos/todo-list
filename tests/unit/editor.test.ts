import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, type EffectScope } from 'vue'
import { useNoteEditor } from '../../app/composables/useNoteEditor'
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
})
