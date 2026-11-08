<script setup lang="ts">
import { computed, ref } from 'vue'
import { useNotesStore } from '../stores/notes'
const store = useNotesStore()
const search = ref('')
const filter = ref<'all' | 'active' | 'done'>('all')
const completed = computed(() =>
  store.notes.reduce((sum, note) => sum + note.todos.filter((todo) => todo.done).length, 0),
)
const total = computed(() => store.notes.reduce((sum, note) => sum + note.todos.length, 0))
const visible = computed(() =>
  store.notes.filter((note) => {
    const matches = `${note.title} ${note.todos.map((todo) => todo.text).join(' ')}`
      .toLocaleLowerCase('ru')
      .includes(search.value.trim().toLocaleLowerCase('ru'))
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
useHead({ title: 'Все заметки — Тихо' })
</script>

<template>
  <main id="main" class="workspace">
    <div class="workspace__intro">
      <div>
        <p class="eyebrow date-label">{{ today }}</p>
        <h1>
          Место для
          <em>важного.</em>
        </h1>
        <p class="intro-copy">Соберите мысли. Наметьте шаги. Двигайтесь в своём ритме.</p>
      </div>
      <NuxtLink class="button button--primary button--create" to="/notes/new">
        <AppIcon name="plus" />
        Новая заметка
      </NuxtLink>
    </div>
    <div class="workspace-summary">
      <span>
        <span class="status-dot" />
        Личное пространство
      </span>
      <span>
        {{ store.notes.length }} заметок
        <span class="summary-divider">/</span>
        {{ completed }} из {{ total }} задач выполнено
      </span>
    </div>
    <section class="notes-section" aria-labelledby="notes-heading">
      <div class="notes-toolbar">
        <div class="notes-toolbar__left">
          <h2 id="notes-heading">
            Мои заметки
            <span>{{ store.notes.length }}</span>
          </h2>
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
        <NoteCard v-for="(note, index) in visible" :key="note.id" :note="note" :index="index" />
        <NuxtLink to="/notes/new" class="new-note-tile">
          <span><AppIcon name="plus" :size="27" /></span>
          Ещё одна хорошая мысль
          <small>Создать заметку</small>
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
        <div class="paper-illustration" aria-hidden="true">
          <div class="paper-illustration__back" />
          <div class="paper-illustration__sheet">
            <span />
            <i />
            <i />
            <i />
            <div><AppIcon name="check" :size="20" /></div>
          </div>
          <span class="paper-illustration__spark">✳</span>
        </div>
        <span class="eyebrow">ЧИСТЫЙ ЛИСТ — ХОРОШЕЕ НАЧАЛО</span>
        <h3>
          Большие планы начинаются
          <br />
          с маленькой заметки
        </h3>
        <p>
          Список дел, идея или планы на выходные.
          <br />
          Оставьте здесь то, что не хочется держать в голове.
        </p>
        <NuxtLink to="/notes/new" class="button button--primary">
          <AppIcon name="plus" :size="18" />
          Создать первую заметку
        </NuxtLink>
        <span class="empty-state__hint">Сохраняется на устройстве. Без регистрации.</span>
      </div>
    </section>
    <aside class="workspace-note">
      <AppIcon name="leaf" :size="21" />
      <p>
        Не обязательно успеть всё.
        <br />
        <strong>Достаточно начать с одного шага.</strong>
      </p>
      <span>ТИХО, ПО СВОЕМУ</span>
    </aside>
  </main>
</template>
