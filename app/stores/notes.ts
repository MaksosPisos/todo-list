import { defineStore } from 'pinia'
import { ref } from 'vue'
import { NotesRepository, type StoragePort, type SaveResult } from '../domain/storage'
import type { Note, NoteContent } from '../domain/notes'

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>([])
  const ready = ref(false)
  const warning = ref('')
  let repository: NotesRepository | null = null

  function sync(): void {
    if (!repository) return
    try {
      const result = repository.load()
      notes.value = result.notes
      warning.value = result.damaged
        ? 'Часть сохранённых данных повреждена или имеет неподдерживаемую версию. Исходные данные сохранены.'
        : ''
    } catch {
      warning.value = 'Хранилище браузера недоступно. Проверьте разрешения и свободное место.'
    }
  }
  function initialize(storage: StoragePort): void {
    repository = new NotesRepository(storage)
    sync()
    ready.value = true
  }
  function failStorage(): void {
    ready.value = true
    warning.value =
      'Хранилище браузера недоступно. Сохранение не работает; разрешите доступ к данным сайта.'
  }
  function save(
    id: string,
    content: NoteContent,
    baseRevision: string | null,
  ): SaveResult | 'error' {
    if (!repository) {
      failStorage()
      return 'error'
    }
    if (content.todos.some((todo) => !todo.text.trim())) return 'error'
    const note: Note = {
      id,
      title: content.title.trim() || 'Без названия',
      todos: content.todos.map((todo) => ({ ...todo, text: todo.text.trim() })),
      updatedAt: new Date().toISOString(),
      revision: crypto.randomUUID(),
    }
    try {
      const result = repository.save(note, baseRevision)
      sync()
      return result
    } catch {
      warning.value =
        'Не удалось сохранить заметку. Проверьте доступ к хранилищу и свободное место.'
      return 'error'
    }
  }
  function remove(id: string): boolean {
    if (!repository) return false
    try {
      repository.delete(id)
      sync()
      return true
    } catch {
      warning.value = 'Не удалось удалить заметку из хранилища.'
      return false
    }
  }
  return { notes, ready, warning, initialize, sync, save, remove, failStorage }
})
