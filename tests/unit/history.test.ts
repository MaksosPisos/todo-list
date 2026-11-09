import { describe, expect, it } from 'vitest'
import { EditHistory, applyChange, type Change } from '../../app/domain/history'
import type { NoteContent } from '../../app/domain/notes'
import { makeNote } from './helpers'

describe('command history', () => {
  it('reverses and replays mixed atomic operations in order', () => {
    const note = makeNote()
    const history = new EditHistory()
    const changes: Change[] = [
      { kind: 'title', before: 'Планы', after: 'Неделя' },
      { kind: 'text', id: 't1', before: 'Начать', after: 'Завершить' },
      { kind: 'toggle', id: 't1', before: false, after: true },
      { kind: 'insert', index: 1, todo: { id: 't2', text: 'Отдохнуть', done: false } },
      { kind: 'remove', index: 0, todo: { id: 't1', text: 'Завершить', done: true } },
    ]
    for (const change of changes) {
      applyChange(note, change, true)
      history.record(change)
    }
    expect(note.todos.map((todo) => todo.id)).toEqual(['t2'])
    for (const _ of changes) history.undo(note)
    expect(note).toEqual(makeNote())
    expect(history.canUndo).toBe(false)
    for (const _ of changes) history.redo(note)
    expect(note.title).toBe('Неделя')
    expect(note.todos).toEqual([{ id: 't2', text: 'Отдохнуть', done: false }])
    expect(history.canRedo).toBe(false)
  })
  it('keeps a burst of typing as one supplied text command, and ignores no-ops', () => {
    const note = makeNote()
    const history = new EditHistory()
    note.title = 'Один непрерывный ввод'
    history.record({ kind: 'title', before: 'Планы', after: note.title })
    history.record({ kind: 'title', before: note.title, after: note.title })
    expect(history.size).toBe(1)
    history.undo(note)
    expect(note.title).toBe('Планы')
  })
  it('clears redo after a new operation, but not after a no-op', () => {
    const history = new EditHistory()
    const note = makeNote()
    history.record({ kind: 'title', before: 'Планы', after: 'A' })
    note.title = 'A'
    history.undo(note)
    history.record({ kind: 'title', before: 'Планы', after: 'Планы' })
    expect(history.canRedo).toBe(true)
    history.record({ kind: 'title', before: 'Планы', after: 'B' })
    expect(history.canRedo).toBe(false)
  })
  it('retains at most 50 operations and does not undo evicted changes', () => {
    const note: NoteContent = { title: '0', todos: [] }
    const history = new EditHistory()
    for (let i = 1; i <= 60; i++) {
      history.record({ kind: 'title', before: note.title, after: String(i) })
      note.title = String(i)
    }
    expect(history.size).toBe(50)
    for (let i = 0; i < 70; i++) history.undo(note)
    expect(note.title).toBe('10')
    for (let i = 0; i < 70; i++) history.redo(note)
    expect(note.title).toBe('60')
    expect(history.size).toBe(50)
  })
  it('captures the deleted item and its original position without sharing references', () => {
    const note = makeNote()
    const history = new EditHistory()
    const todo = note.todos[0]!
    history.record({ kind: 'remove', index: 0, todo })
    note.todos = []
    todo.text = 'mutated externally'
    history.undo(note)
    expect(note.todos[0]?.text).toBe('Начать')
    note.todos[0]!.text = 'changed after undo'
    history.redo(note)
    history.undo(note)
    expect(note.todos[0]?.text).toBe('Начать')
  })
  it('clears both branches at the end of an editing session', () => {
    const history = new EditHistory()
    const note = makeNote()
    history.record({ kind: 'title', before: 'Планы', after: 'A' })
    history.undo(note)
    history.clear()
    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(false)
    history.undo(note)
    history.redo(note)
    expect(note).toEqual(makeNote())
  })
})
