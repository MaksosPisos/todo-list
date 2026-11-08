export interface Todo {
  id: string
  text: string
  done: boolean
}
export interface Note {
  id: string
  title: string
  todos: Todo[]
  updatedAt: string
  revision: string
}
export interface NoteContent {
  title: string
  todos: Todo[]
}

export function cloneContent(note: NoteContent): NoteContent {
  return { title: note.title, todos: note.todos.map((todo) => ({ ...todo })) }
}

export function sameContent(a: NoteContent, b: NoteContent): boolean {
  return (
    a.title === b.title &&
    a.todos.length === b.todos.length &&
    a.todos.every((todo, index) => {
      const other = b.todos[index]
      return other?.id === todo.id && other.text === todo.text && other.done === todo.done
    })
  )
}

export function isNote(value: unknown): value is Note {
  if (!value || typeof value !== 'object') return false
  const note = value as Record<string, unknown>
  return (
    typeof note.id === 'string' &&
    note.id.length > 0 &&
    typeof note.title === 'string' &&
    typeof note.updatedAt === 'string' &&
    Number.isFinite(Date.parse(note.updatedAt)) &&
    typeof note.revision === 'string' &&
    Array.isArray(note.todos) &&
    note.todos.every((todo: unknown) => {
      if (!todo || typeof todo !== 'object') return false
      const item = todo as Record<string, unknown>
      return (
        typeof item.id === 'string' &&
        typeof item.text === 'string' &&
        typeof item.done === 'boolean'
      )
    }) &&
    new Set(note.todos.map((todo: Todo) => todo.id)).size === note.todos.length
  )
}
