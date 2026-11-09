<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { cloneContent } from '../../domain/notes'
import { useNotesStore } from '../../stores/notes'
import { useNoteEditor } from '../../composables/useNoteEditor'
import { useConfirmation } from '../../composables/useConfirmation'

const route = useRoute()
const router = useRouter()
const store = useNotesStore()
const routeId = String(route.params.id)
const isNew = routeId === 'new'
const id = isNew ? 'new' : routeId
const original = store.notes.find((note) => note.id === routeId)
const initiallyMissing = !isNew && !original
const editor = useNoteEditor(
  id,
  original ? cloneContent(original) : { title: '', todos: [] },
  original?.revision ?? null,
)
const { content, dirty, canUndo, canRedo, draftMessage, draftError } = editor
const { options, ask, settle } = useConfirmation()
const missing = computed(() => !isNew && !store.notes.some((note) => note.id === routeId))
const invalidIds = ref<string[]>([])
const error = ref('')
const leaving = ref(false)
const completed = computed(() => content.value.todos.filter((todo) => todo.done).length)
const conflict = computed(
  () =>
    !isNew &&
    !missing.value &&
    store.notes.find((note) => note.id === routeId)?.revision !== editor.baseRevision.value,
)
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
  editor.flushText()
  invalidIds.value = content.value.todos.filter((todo) => !todo.text.trim()).map((todo) => todo.id)
  if (invalidIds.value.length) {
    error.value = 'У задачи должен быть текст. Заполните пустые строки или удалите их.'
    await focusTodo(invalidIds.value[0]!)
    return
  }
  const savedId = isNew ? crypto.randomUUID() : routeId
  const result = store.save(savedId, content.value, editor.baseRevision.value)
  if (result === 'saved') {
    editor.finish()
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
async function cancel(): Promise<void> {
  if (
    await ask({
      title: 'Отменить редактирование?',
      description:
        'Несохранённые изменения и черновик будут удалены. Сохранённая версия заметки останется прежней.',
      confirmLabel: 'Отменить редактирование',
      cancelLabel: 'Продолжить',
    })
  ) {
    editor.finish()
    leaving.value = true
    await router.push('/')
  }
}
async function remove(): Promise<void> {
  if (
    await ask({
      title: 'Удалить заметку?',
      description:
        'Заметка и все её задачи будут удалены, включая несохранённые изменения. Это действие нельзя отменить.',
      confirmLabel: 'Удалить',
      cancelLabel: 'Оставить',
      danger: true,
    })
  ) {
    if (store.remove(routeId)) {
      editor.finish()
      leaving.value = true
      await router.push('/')
    }
  }
}
function keyboard(event: KeyboardEvent): void {
  if (event.isComposing || options.value || missing.value || event.altKey) return
  if ((event.ctrlKey || event.metaKey) && event.code === 'KeyZ') {
    // One history owns text and structural edits, including focused inputs.
    event.preventDefault()
    if (event.shiftKey) editor.redo()
    else editor.undo()
  }
}
onMounted(async () => {
  window.addEventListener('keydown', keyboard, true)
  if (initiallyMissing) return
  const draft = editor.getDraft()
  if (draft) {
    const restore = await ask({
      title: 'Вернуться к черновику?',
      description:
        'В этой вкладке остались несохранённые изменения. Восстановить их и продолжить с того же места?',
      confirmLabel: 'Восстановить',
      cancelLabel: 'Удалить черновик',
    })
    if (restore) editor.restore(draft)
    else editor.clearDraft()
  }
})
onBeforeUnmount(() => window.removeEventListener('keydown', keyboard, true))
async function confirmLeave(): Promise<boolean> {
  if (leaving.value || !dirty.value) return true
  const discard = await ask({
    title: 'Уйти без сохранения?',
    description:
      'Несохранённые изменения и черновик будут удалены. Сначала сохраните заметку, если хотите оставить изменения.',
    confirmLabel: 'Уйти без сохранения',
    cancelLabel: 'Остаться',
  })
  if (discard) editor.finish()
  return discard
}
onBeforeRouteLeave(confirmLeave)
onBeforeRouteUpdate((to, from) => {
  if (to.params.id === from.params.id) return true
  return confirmLeave()
})
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
      <div v-if="missing" class="inline-notice" role="status">
        <AppIcon name="warning" />
        <div>
          <strong>Заметка удалена в другой вкладке.</strong>
          <p>
            Текущий текст остаётся здесь: его можно скопировать. Удалённая заметка не будет создана
            заново.
          </p>
        </div>
      </div>
      <div v-else-if="conflict" class="inline-notice" role="status">
        <AppIcon name="warning" />
        <div>
          <strong>В другой вкладке появилась новая версия.</strong>
          <p>
            Скопируйте нужный текст и откройте заметку заново. Сохранение поверх новой версии
            заблокировано.
          </p>
        </div>
      </div>
      <div class="editor-columns">
        <section class="editor-paper" aria-label="Редактор заметки">
          <div class="editor-paper__toolbar">
            <span class="eyebrow">{{ isNew ? 'НОВАЯ ЗАМЕТКА' : 'ЗАМЕТКА' }}</span>
            <div class="history-controls">
              <button
                class="icon-button"
                :disabled="!canUndo || missing"
                aria-label="Отменить изменение"
                title="Отменить изменение (Ctrl+Z / ⌘Z)"
                @click="editor.undo"
              >
                <AppIcon name="undo" :size="18" />
              </button>
              <button
                class="icon-button"
                :disabled="!canRedo || missing"
                aria-label="Повторить изменение"
                title="Повторить изменение (Ctrl+Shift+Z / ⌘⇧Z)"
                @click="editor.redo"
              >
                <AppIcon name="redo" :size="18" />
              </button>
            </div>
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
            @blur="editor.flushText"
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
              @blur="editor.flushText"
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
            <button class="button button--primary" :disabled="missing || conflict" @click="save">
              <AppIcon name="check" :size="18" />
              Сохранить заметку
            </button>
            <button class="button button--text" @click="cancel">Отменить редактирование</button>
            <div class="draft-status" role="status">
              <AppIcon :name="draftError ? 'warning' : 'shield'" :size="15" />
              <span>
                {{
                  draftError ||
                  draftMessage ||
                  (dirty ? 'Сохраняем черновик…' : 'Изменения ещё не внесены')
                }}
              </span>
            </div>
          </div>
          <details class="keyboard-tip">
            <summary>Быстрые клавиши</summary>
            <div>
              <kbd>Ctrl</kbd>
              +
              <kbd>Z</kbd>
              <span>шаг назад</span>
            </div>
            <div>
              <kbd>Ctrl</kbd>
              +
              <kbd>Shift</kbd>
              +
              <kbd>Z</kbd>
              <span>вперёд</span>
            </div>
            <small>
              На Mac используйте ⌘ вместо Ctrl.
              <br />
            </small>
          </details>
          <button v-if="!isNew && !missing" class="delete-note" @click="remove">
            <AppIcon name="trash" :size="16" />
            Удалить заметку
          </button>
        </aside>
      </div>
    </template>
    <AppModal :options="options" @confirm="settle(true)" @cancel="settle(false)" />
  </main>
</template>
