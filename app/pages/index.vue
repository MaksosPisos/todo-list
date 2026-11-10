<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useNotesStore } from '../stores/notes'
import { useConfirmation } from '../composables/useConfirmation'
const store = useNotesStore()
const { options, ask, settle } = useConfirmation()
const search = ref('')
const debouncedSearch = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, (value) => {
  clearTimeout(searchTimer)
  if (!value.trim()) {
    debouncedSearch.value = ''
    return
  }
  searchTimer = setTimeout(() => {
    debouncedSearch.value = value
  }, 300)
})
onBeforeUnmount(() => clearTimeout(searchTimer))
const filter = useNoteFilter()
const heading = computed(() =>
  filter.value === 'active'
    ? 'В процессе'
    : filter.value === 'done'
      ? 'Завершённые'
      : 'Все заметки',
)
const completed = computed(() =>
  store.notes.reduce((sum, note) => sum + note.todos.filter((todo) => todo.done).length, 0),
)
const total = computed(() => store.notes.reduce((sum, note) => sum + note.todos.length, 0))
const visible = computed(() =>
  store.notes.filter((note) => {
    const matches = `${note.title} ${note.todos.map((todo) => todo.text).join(' ')}`
      .toLocaleLowerCase('ru')
      .includes(debouncedSearch.value.trim().toLocaleLowerCase('ru'))
    const done = note.todos.length > 0 && note.todos.every((todo) => todo.done)
    return matches && (filter.value === 'all' || (filter.value === 'done' ? done : !done))
  }),
)
const today = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
}).format(new Date())
function resetFilters(): void {
  search.value = ''
  filter.value = 'all'
}
async function remove(id: string): Promise<void> {
  const note = store.notes.find((note) => note.id === id)
  if (!note) return
  if (
    await ask({
      title: 'Удалить заметку?',
      description: `«${note.title}» и все её задачи будут удалены. Это действие нельзя отменить.`,
      confirmLabel: 'Удалить',
      cancelLabel: 'Оставить',
      danger: true,
    })
  )
    store.remove(id)
}
useHead({ title: 'Все заметки — Тихо' })
</script>

<template>
  <main id="main" class="workspace">
    <div class="workspace__intro">
      <div class="workspace__title">
        <span class="page-symbol">
          <AppIcon
            :name="filter === 'done' ? 'checked-box' : filter === 'active' ? 'circle' : 'inbox'"
            :size="31"
          />
        </span>
        <div>
          <p class="date-label">{{ today }}</p>
          <h1>{{ heading }}</h1>
        </div>
      </div>
      <NuxtLink class="button button--primary button--create" to="/notes/new">
        <AppIcon name="plus" />
        Новая заметка
      </NuxtLink>
    </div>
    <div class="workspace-summary">
      <span>Ваши планы, идеи и маленькие шаги</span>
      <span>
        Заметок: {{ store.notes.length }}
        <span class="summary-divider">/</span>
        {{ completed }} из {{ total }} задач выполнено
      </span>
    </div>
    <section class="notes-section" aria-labelledby="notes-heading">
      <div class="notes-toolbar">
        <div class="notes-toolbar__left">
          <h2 id="notes-heading" class="sr-only">Мои заметки</h2>
          <div class="filters" role="group" aria-label="Фильтр заметок">
            <button :aria-pressed="filter === 'all'" @click="filter = 'all'">Все</button>
            <button :aria-pressed="filter === 'active'" @click="filter = 'active'">
              В процессе
            </button>
            <button :aria-pressed="filter === 'done'" @click="filter = 'done'">Завершённые</button>
          </div>
        </div>
        <label class="search">
          <AppIcon name="search" :size="18" />
          <span class="sr-only">Поиск по заметкам и задачам</span>
          <input
            v-model="search"
            type="search"
            placeholder="Найти заметку"
            aria-label="Поиск по заметкам и задачам"
          />
        </label>
      </div>
      <div v-if="visible.length" class="notes-grid">
        <NoteCard
          v-for="(note, index) in visible"
          :key="note.id"
          :note="note"
          :index="index"
          @delete="remove"
        />
        <NuxtLink to="/notes/new" class="new-note-tile">
          <span><AppIcon name="plus" :size="27" /></span>
          Создать заметку
        </NuxtLink>
      </div>
      <div v-else-if="store.notes.length" class="empty-state empty-state--search">
        <AppIcon name="search" :size="36" />
        <h3>Здесь пока ничего не нашлось</h3>
        <p>Попробуйте другое слово или выберите все заметки.</p>
        <button class="button button--secondary" @click="resetFilters">
          Сбросить поиск и фильтр
        </button>
      </div>
      <div v-else class="empty-state">
        <div class="empty-state__icon" aria-hidden="true"><AppIcon name="inbox" :size="48" /></div>
        <h3>Освободите место в голове</h3>
        <p>
          Создайте заметку и добавьте первые задачи.
          <br />
          Всё важное будет здесь, когда понадобится.
        </p>
        <NuxtLink to="/notes/new" class="button button--primary">
          <AppIcon name="plus" :size="18" />
          Создать первую заметку
        </NuxtLink>
        <span class="empty-state__hint">Сохраняется на устройстве. Без регистрации.</span>
      </div>
    </section>
    <AppModal :options="options" @confirm="settle(true)" @cancel="settle(false)" />
  </main>
</template>
