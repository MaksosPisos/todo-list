import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { cloneContent, sameContent, type NoteContent } from '../domain/notes'
import { EditHistory, type Change } from '../domain/history'
import { DRAFT_PREFIX, readDraft, saveDraft, type Draft } from '../domain/storage'

type PendingText =
  { field: 'title'; before: string } | { field: 'text'; id: string; before: string }

export function useNoteEditor(id: string, initial: NoteContent, initialRevision: string | null) {
  const content = ref<NoteContent>(cloneContent(initial))
  const baseRevision = ref(initialRevision)
  const baseline = ref<NoteContent>(cloneContent(initial))
  const history = new EditHistory()
  const historyVersion = ref(0)
  const pending = ref<PendingText | null>(null)
  const draftMessage = ref('')
  const draftError = ref('')
  let textTimer: ReturnType<typeof setTimeout> | undefined
  let draftTimer: ReturnType<typeof setTimeout> | undefined
  let stopped = false
  let recoveryPending = false
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
  function getDraft(): Draft | null {
    try {
      const draft = readDraft(window.sessionStorage, id)
      recoveryPending = draft !== null
      return draft
    } catch {
      draftError.value = 'Не удалось прочитать черновик. Сохранённые заметки не затронуты.'
      return null
    }
  }
  function restore(draft: Draft): void {
    recoveryPending = false
    flushText()
    content.value = cloneContent(draft.note)
    baseRevision.value = draft.baseRevision
    history.clear()
    historyVersion.value++
    draftMessage.value = 'Черновик восстановлен'
  }
  function clearDraft(): void {
    recoveryPending = false
    clearTimeout(draftTimer)
    try {
      window.sessionStorage.removeItem(DRAFT_PREFIX + id)
    } catch {
      draftError.value = 'Не удалось очистить черновик в браузере.'
    }
  }
  function persistDraft(): void {
    clearTimeout(draftTimer)
    if (stopped || recoveryPending) return
    if (!dirty.value) {
      clearDraft()
      draftMessage.value = ''
      return
    }
    try {
      saveDraft(window.sessionStorage, id, content.value, baseRevision.value)
      draftMessage.value = 'Черновик сохранён в этой вкладке'
      draftError.value = ''
    } catch {
      draftError.value =
        'Черновик не сохранён: хранилище недоступно или заполнено. Не закрывайте вкладку до сохранения заметки.'
    }
  }
  function finish(): void {
    stopped = true
    flushText()
    clearDraft()
    history.clear()
    historyVersion.value++
  }
  watch(
    content,
    () => {
      if (stopped) return
      draftMessage.value = ''
      clearTimeout(draftTimer)
      draftTimer = setTimeout(persistDraft, 800)
    },
    { deep: true },
  )
  function onPageHide(): void {
    persistDraft()
  }
  function onVisibility(): void {
    if (document.visibilityState === 'hidden') persistDraft()
  }
  window.addEventListener('pagehide', onPageHide)
  window.addEventListener('beforeunload', onPageHide)
  document.addEventListener('visibilitychange', onVisibility)
  onBeforeUnmount(() => {
    persistDraft()
    clearTimeout(textTimer)
    clearTimeout(draftTimer)
    window.removeEventListener('pagehide', onPageHide)
    window.removeEventListener('beforeunload', onPageHide)
    document.removeEventListener('visibilitychange', onVisibility)
  })
  return {
    content,
    baseRevision,
    dirty,
    canUndo,
    canRedo,
    draftMessage,
    draftError,
    flushText,
    updateText,
    addTodo,
    removeTodo,
    toggleTodo,
    undo,
    redo,
    getDraft,
    restore,
    clearDraft,
    finish,
  }
}
