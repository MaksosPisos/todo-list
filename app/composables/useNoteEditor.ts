import { computed, onBeforeUnmount, ref } from 'vue'
import { cloneContent, sameContent, type NoteContent } from '../domain/notes'
import { EditHistory, type Change } from '../domain/history'

type PendingText =
  { field: 'title'; before: string } | { field: 'text'; id: string; before: string }

export function useNoteEditor(id: string, initial: NoteContent, initialRevision: string | null) {
  const content = ref<NoteContent>(cloneContent(initial))
  const baseRevision = ref(initialRevision)
  const baseline = ref<NoteContent>(cloneContent(initial))
  const history = new EditHistory()
  const historyVersion = ref(0)
  const pending = ref<PendingText | null>(null)
  let textTimer: ReturnType<typeof setTimeout> | undefined
  const dirty = computed(() => !sameContent(content.value, baseline.value))
  const canUndo = computed(() => {
    void historyVersion.value
    return history.canUndo || pending.value !== null
  })
  const canRedo = computed(() => {
    void historyVersion.value
    return history.canRedo && pending.value === null
  })

  function flushText(): void {
    clearTimeout(textTimer)
    const edit = pending.value
    if (!edit) return
    if (edit.field === 'title')
      history.record({ kind: 'title', before: edit.before, after: content.value.title })
    else {
      const todo = content.value.todos.find((todo) => todo.id === edit.id)
      if (todo) history.record({ kind: 'text', id: edit.id, before: edit.before, after: todo.text })
    }
    pending.value = null
    historyVersion.value++
  }
  function updateText(field: 'title' | 'text', value: string, todoId?: string): void {
    if (field === 'title') {
      if (pending.value?.field !== 'title') {
        flushText()
        pending.value = { field, before: content.value.title }
      }
      content.value.title = value
    } else {
      const todo = content.value.todos.find((todo) => todo.id === todoId)
      if (!todo) return
      if (pending.value?.field !== 'text' || pending.value.id !== todo.id) {
        flushText()
        pending.value = { field, id: todo.id, before: todo.text }
      }
      todo.text = value
    }
    clearTimeout(textTimer)
    textTimer = setTimeout(flushText, 650)
  }
  function mutate(change: Change, apply: () => void): void {
    flushText()
    apply()
    history.record(change)
    historyVersion.value++
  }
  function addTodo(): string {
    const todo = { id: crypto.randomUUID(), text: '', done: false }
    mutate({ kind: 'insert', index: content.value.todos.length, todo }, () =>
      content.value.todos.push(todo),
    )
    return todo.id
  }
  function removeTodo(todoId: string): void {
    flushText()
    const index = content.value.todos.findIndex((todo) => todo.id === todoId)
    const todo = content.value.todos[index]
    if (!todo) return
    mutate({ kind: 'remove', index, todo }, () => {
      content.value.todos.splice(index, 1)
    })
  }
  function toggleTodo(todoId: string): void {
    const todo = content.value.todos.find((todo) => todo.id === todoId)
    if (!todo) return
    mutate({ kind: 'toggle', id: todoId, before: todo.done, after: !todo.done }, () => {
      todo.done = !todo.done
    })
  }
  function undo(): void {
    flushText()
    history.undo(content.value)
    historyVersion.value++
  }
  function redo(): void {
    flushText()
    history.redo(content.value)
    historyVersion.value++
  }
  function finish(): void {
    flushText()
    history.clear()
    historyVersion.value++
  }
  onBeforeUnmount(() => clearTimeout(textTimer))
  return {
    content,
    baseRevision,
    dirty,
    canUndo,
    canRedo,
    flushText,
    updateText,
    addTodo,
    removeTodo,
    toggleTodo,
    undo,
    redo,
    finish,
  }
}
