import type { NoteContent, Todo } from './notes'

// Only changed values are retained, never snapshots of the whole note.
export type Change =
  | { kind: 'title'; before: string; after: string }
  | { kind: 'text'; id: string; before: string; after: string }
  | { kind: 'toggle'; id: string; before: boolean; after: boolean }
  | { kind: 'insert' | 'remove'; index: number; todo: Todo }

export function applyChange(note: NoteContent, change: Change, forward: boolean): void {
  if (change.kind === 'title') {
    note.title = forward ? change.after : change.before
    return
  }
  if (change.kind === 'text' || change.kind === 'toggle') {
    const todo = note.todos.find((item) => item.id === change.id)
    if (!todo) return
    if (change.kind === 'text') todo.text = forward ? change.after : change.before
    else todo.done = forward ? change.after : change.before
    return
  }
  const insert = (change.kind === 'insert') === forward
  if (insert) note.todos.splice(change.index, 0, { ...change.todo })
  else {
    const index = note.todos.findIndex((todo) => todo.id === change.todo.id)
    if (index !== -1) note.todos.splice(index, 1)
  }
}

export class EditHistory {
  private past: Change[] = []
  private future: Change[] = []
  get canUndo(): boolean {
    return this.past.length > 0
  }
  get canRedo(): boolean {
    return this.future.length > 0
  }
  get size(): number {
    return this.past.length
  }
  record(change: Change): void {
    if ('before' in change && change.before === change.after) return
    // Detached copy protects insert/remove commands from later edits.
    this.past.push('todo' in change ? { ...change, todo: { ...change.todo } } : { ...change })
    if (this.past.length > 50) this.past.shift()
    this.future = []
  }
  undo(note: NoteContent): void {
    const change = this.past.pop()
    if (!change) return
    applyChange(note, change, false)
    this.future.push(change)
  }
  redo(note: NoteContent): void {
    const change = this.future.pop()
    if (!change) return
    applyChange(note, change, true)
    this.past.push(change)
  }
  clear(): void {
    this.past = []
    this.future = []
  }
}
