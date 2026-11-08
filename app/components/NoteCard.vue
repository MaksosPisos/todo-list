<script setup lang="ts">
import { computed } from 'vue'
import type { Note } from '../domain/notes'
const props = defineProps<{ note: Note; index: number }>()
defineEmits<{ delete: [id: string] }>()
const completed = computed(() => props.note.todos.filter((todo) => todo.done).length)
const date = computed(() =>
  new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(
    new Date(props.note.updatedAt),
  ),
)
</script>

<template>
  <article class="note-card" :class="`note-card--${index % 3}`">
    <div class="note-card__top">
      <span class="eyebrow">ЗАМЕТКА {{ String(index + 1).padStart(2, '0') }}</span>
      <button
        class="icon-button note-card__delete"
        :aria-label="`Удалить заметку «${note.title}»`"
        @click="$emit('delete', note.id)"
      >
        <AppIcon name="trash" :size="17" />
      </button>
    </div>
    <h2>
      <NuxtLink :to="`/notes/${note.id}`">{{ note.title }}</NuxtLink>
    </h2>
    <ul v-if="note.todos.length" class="note-card__todos" aria-label="Предпросмотр задач">
      <li v-for="todo in note.todos.slice(0, 3)" :key="todo.id" :class="{ 'is-done': todo.done }">
        <span
          class="preview-check"
          :class="{ 'preview-check--done': todo.done }"
          aria-hidden="true"
        >
          <AppIcon v-if="todo.done" name="check" :size="12" />
        </span>
        <span class="sr-only">{{ todo.done ? 'Выполнено: ' : 'Не выполнено: ' }}</span>
        <span class="note-card__text">{{ todo.text }}</span>
      </li>
    </ul>
    <p v-else class="note-card__empty">Пока без задач. Всё начинается с мысли.</p>
    <span v-if="note.todos.length > 3" class="note-card__more">
      Ещё {{ note.todos.length - 3 }}
    </span>
    <div class="note-card__bottom">
      <span>{{ note.todos.length ? `${completed} из ${note.todos.length} выполнено` : date }}</span>
      <NuxtLink
        :to="`/notes/${note.id}`"
        class="note-card__open"
        :aria-label="`Редактировать заметку «${note.title}»`"
      >
        <AppIcon name="arrow" :size="20" />
      </NuxtLink>
    </div>
    <div v-if="note.todos.length" class="note-card__progress" aria-hidden="true">
      <span :style="{ width: `${(completed / note.todos.length) * 100}%` }" />
    </div>
  </article>
</template>
