<script setup lang="ts">
import { useNotesStore } from './stores/notes'
const store = useNotesStore()
const route = useRoute()
const { theme, toggleTheme } = useTheme()
const filter = useNoteFilter()
const doneNotes = computed(
  () =>
    store.notes.filter((note) => note.todos.length > 0 && note.todos.every((todo) => todo.done))
      .length,
)
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#main">Перейти к содержимому</a>
    <aside class="app-sidebar" aria-label="Боковая панель">
      <div class="sidebar-heading">
        <NuxtLink to="/" class="brand" aria-label="Тихо — все заметки">
          <span class="brand__mark"><AppIcon name="check" :size="22" /></span>
          <span>
            TodoList
            <span class="brand__dot">.</span>
          </span>
        </NuxtLink>
      </div>
      <nav class="sidebar-nav" aria-label="Навигация по заметкам">
        <NuxtLink
          to="/"
          class="sidebar-link"
          :class="{ 'is-active': route.path === '/' && filter === 'all' }"
          :aria-current="route.path === '/' && filter === 'all' ? 'page' : undefined"
          aria-label="Открыть все заметки"
        >
          <AppIcon name="inbox" class="nav-icon--blue" />
          <span>Все заметки</span>
          <span class="sidebar-count">{{ store.notes.length }}</span>
        </NuxtLink>
        <NuxtLink
          to="/?filter=active"
          class="sidebar-link"
          :class="{ 'is-active': route.path === '/' && filter === 'active' }"
          :aria-current="route.path === '/' && filter === 'active' ? 'page' : undefined"
        >
          <AppIcon name="circle" class="nav-icon--orange" />
          <span>В процессе</span>
          <span class="sidebar-count">{{ store.notes.length - doneNotes }}</span>
        </NuxtLink>
        <NuxtLink
          to="/?filter=done"
          class="sidebar-link"
          :class="{ 'is-active': route.path === '/' && filter === 'done' }"
          :aria-current="route.path === '/' && filter === 'done' ? 'page' : undefined"
        >
          <AppIcon name="checked-box" class="nav-icon--green" />
          <span>Завершённые</span>
          <span class="sidebar-count">{{ doneNotes }}</span>
        </NuxtLink>
      </nav>
      <div class="sidebar-lists">
        <p class="sidebar-section-label">
          Мои заметки
          <span>{{ store.notes.length }}</span>
        </p>
        <nav v-if="store.notes.length" aria-label="Мои списки" class="sidebar-note-list">
          <NuxtLink
            v-for="note in store.notes"
            :key="note.id"
            :to="`/notes/${note.id}`"
            class="sidebar-link sidebar-link--note"
            :class="{ 'is-active': route.path === `/notes/${note.id}` }"
            :aria-current="route.path === `/notes/${note.id}` ? 'page' : undefined"
            :aria-label="`Открыть список «${note.title}»`"
          >
            <span class="list-dot" />
            <span>{{ note.title }}</span>
          </NuxtLink>
        </nav>
        <p v-else class="sidebar-empty">Ваши заметки появятся здесь</p>
        <NuxtLink to="/notes/new" class="sidebar-add">
          <AppIcon name="plus" :size="17" />
          Новая заметка
        </NuxtLink>
      </div>
      <div class="sidebar-bottom">
        <button
          type="button"
          class="theme-switch"
          :aria-pressed="theme === 'dark'"
          aria-label="Тёмная тема"
          :title="theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'"
          @click="toggleTheme"
        >
          <AppIcon :name="theme === 'dark' ? 'moon' : 'sun'" :size="18" />
          <span>{{ theme === 'dark' ? 'Тёмная тема' : 'Светлая тема' }}</span>
          <span class="theme-switch__track" aria-hidden="true"><span /></span>
        </button>
      </div>
    </aside>
    <div class="app-content">
      <div v-if="store.warning" class="storage-warning" role="status">
        <AppIcon name="warning" />
        {{ store.warning }}
      </div>
      <NuxtPage :page-key="(pageRoute) => pageRoute.path" />
      <footer class="site-footer">
        <span>Всё важное — на своём месте.</span>
        <span>тихо.</span>
      </footer>
    </div>
  </div>
</template>
