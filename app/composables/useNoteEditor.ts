import { computed, ref } from 'vue'
import { cloneContent, sameContent, type NoteContent } from '../domain/notes'

export function useNoteEditor(initial: NoteContent, initialRevision: string | null) {
  const content = ref<NoteContent>(cloneContent(initial))
  const baseline = cloneContent(initial)
  const baseRevision = ref(initialRevision)
  const dirty = computed(() => !sameContent(content.value, baseline))

  function updateText(field: 'title' | 'text', value: string, todoId?: string): void {
    if (field === 'title') content.value.title = value
    else {
      const todo = content.value.todos.find((todo) => todo.id === todoId)
      if (todo) todo.text = value
    }
  }
  function addTodo(): string {
    const todo = { id: crypto.randomUUID(), text: '', done: false }
    content.value.todos.push(todo)
    return todo.id
  }
  function removeTodo(todoId: string): void {
    content.value.todos = content.value.todos.filter((todo) => todo.id !== todoId)
  }
  function toggleTodo(todoId: string): void {
    const todo = content.value.todos.find((todo) => todo.id === todoId)
    if (todo) todo.done = !todo.done
  }
  return { content, baseRevision, dirty, updateText, addTodo, removeTodo, toggleTodo }
}
