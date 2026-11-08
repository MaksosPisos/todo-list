<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { cloneContent } from '../../domain/notes'
import { useNotesStore } from '../../stores/notes'
import { useNoteEditor } from '../../composables/useNoteEditor'

const route = useRoute()
const router = useRouter()
const store = useNotesStore()
const routeId = String(route.params.id)
const isNew = routeId === 'new'
const original = store.notes.find((note) => note.id === routeId)
const initiallyMissing = !isNew && !original
const editor = useNoteEditor(
  original ? cloneContent(original) : { title: '', todos: [] },
  original?.revision ?? null,
)
const { content, dirty } = editor
const missing = computed(() => !isNew && !store.notes.some((note) => note.id === routeId))
const invalidIds = ref<string[]>([])
const error = ref('')
const leaving = ref(false)
const completed = computed(() => content.value.todos.filter((todo) => todo.done).length)
watch(
  content,
  () => {
    if (invalidIds.value.length && content.value.todos.every((todo) => todo.text.trim())) {
      invalidIds.value = []
      error.value = ''
    }
  },
  { deep: true },
)

async function focusTodo(todoId: string): Promise<void> {
  await nextTick()
  document.getElementById(`todo-${todoId}`)?.focus()
}
function addTodo(): void {
  void focusTodo(editor.addTodo())
}
function removeTodo(todoId: string, index: number): void {
  editor.removeTodo(todoId)
  const next = content.value.todos[index] ?? content.value.todos[index - 1]
  if (next) void focusTodo(next.id)
  else void nextTick(() => document.getElementById('add-todo')?.focus())
}
async function save(): Promise<void> {
  invalidIds.value = content.value.todos.filter((todo) => !todo.text.trim()).map((todo) => todo.id)
  if (invalidIds.value.length) {
    error.value = 'У задачи должен быть текст. Заполните пустые строки или удалите их.'
    await focusTodo(invalidIds.value[0]!)
    return
  }
  const savedId = isNew ? crypto.randomUUID() : routeId
  const result = store.save(savedId, content.value, editor.baseRevision.value)
  if (result === 'saved') {
    leaving.value = true
    await router.push('/')
    return
  }
  error.value =
    result === 'missing'
      ? 'Заметка удалена в другой вкладке. Её нельзя сохранить поверх удалённой.'
      : result === 'conflict'
        ? 'В другой вкладке сохранена новая версия. Скопируйте нужный текст и откройте заметку заново.'
        : 'Не удалось сохранить заметку. Ваш текст остаётся в редакторе.'
}
useHead({
  title: computed(
    () => `${isNew ? 'Новая заметка' : content.value.title || 'Без названия'} — Тихо`,
  ),
})
</script>

<template>
  <main id="main" class="editor-layout">
    <NuxtLink to="/" class="back-link">
      <AppIcon name="back" :size="17" />
      Все заметки
    </NuxtLink>
    <section v-if="initiallyMissing" class="missing-state">
      <span class="missing-state__number">404</span>
      <h1>Эта заметка не нашлась</h1>
      <p>
        Возможно, её удалили или в ссылке есть ошибка.
        <br />
        Остальные мысли на своём месте.
      </p>
      <NuxtLink class="button button--primary" to="/">
        К моим заметкам
        <AppIcon name="arrow" :size="18" />
      </NuxtLink>
    </section>
    <template v-else>
      <div class="editor-heading">
        <div>
          <p class="eyebrow">Мои списки</p>
          <h1>
            {{ isNew ? 'Новая заметка' : 'Редактирование' }}
          </h1>
        </div>
        <span class="editor-status">
          <span class="status-dot" :class="{ 'status-dot--unsaved': dirty }" />
          {{ dirty ? 'Есть изменения' : 'Без изменений' }}
        </span>
      </div>
      <div class="editor-columns">
        <section class="editor-paper" aria-label="Редактор заметки">
          <div class="editor-paper__toolbar">
            <span class="eyebrow">{{ isNew ? 'НОВАЯ ЗАМЕТКА' : 'ЗАМЕТКА' }}</span>
          </div>
          <label class="field-label" for="note-title">Название</label>
          <input
            id="note-title"
            class="title-input"
            :readonly="missing"
            :value="content.title"
            maxlength="200"
            placeholder="О чём эта заметка?"
            autocomplete="off"
            @input="editor.updateText('title', ($event.target as HTMLInputElement).value)"
          />
          <p class="field-hint">Можно оставить пустым — назовём «Без названия».</p>
          <div class="todo-heading">
            <h2>Задачи</h2>
            <span>{{ completed }} / {{ content.todos.length }}</span>
          </div>
          <div class="editor-progress" aria-hidden="true">
            <span
              :style="{
                width: content.todos.length ? `${(completed / content.todos.length) * 100}%` : '0%',
              }"
            />
          </div>
          <ul v-if="content.todos.length" class="todo-list">
            <TodoRow
              v-for="(todo, index) in content.todos"
              :key="todo.id"
              :todo="todo"
              :number="index + 1"
              :readonly="missing"
              :invalid="invalidIds.includes(todo.id) && !todo.text.trim()"
              @text="editor.updateText('text', $event, todo.id)"
              @toggle="editor.toggleTodo(todo.id)"
              @remove="removeTodo(todo.id, index)"
              @enter="addTodo"
            />
          </ul>
          <div v-else class="editor-empty">
            <span class="editor-empty__circle"><AppIcon name="check" :size="23" /></span>
            <p>
              Здесь начинаются ваши планы.
              <br />
              <span>Добавьте задачу — или оставьте только заголовок.</span>
            </p>
          </div>
          <button id="add-todo" type="button" class="add-todo" :disabled="missing" @click="addTodo">
            <AppIcon name="plus" :size="18" />
            Добавить задачу
            <span>↵</span>
          </button>
          <p v-if="error" id="validation-error" class="form-error" role="alert">{{ error }}</p>
        </section>
        <aside class="editor-sidebar">
          <div class="save-panel">
            <button class="button button--primary" :disabled="missing" @click="save">
              <AppIcon name="check" :size="18" />
              Сохранить заметку
            </button>
          </div>
        </aside>
      </div>
    </template>
  </main>
</template>
