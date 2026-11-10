<script setup lang="ts">
import { computed } from 'vue'
import type { Note } from '../domain/notes'
const props = defineProps<{ note: Note; index: number }>()
defineEmits<{ delete: [id: string] }>()
const completed = computed(() => props.note.todos.filter((todo) => todo.done).length)
const progress = computed(() =>
  props.note.todos.length ? completed.value / props.note.todos.length : 0,
)
const date = computed(() =>
  new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(
    new Date(props.note.updatedAt),
  ),
)

function preventSelectionNavigation(event: MouseEvent): void {
  if (event.detail === 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
  const selection = window.getSelection()
  const link = event.currentTarget as HTMLAnchorElement
  if (
    selection &&
    !selection.isCollapsed &&
    (link.contains(selection.anchorNode) || link.contains(selection.focusNode))
  ) {
    event.preventDefault()
  }
}
</script>

<template>
  <article class="note-card" :class="{ 'note-card--complete': progress === 1 }">
    <NuxtLink
      :to="`/notes/${note.id}`"
      class="note-card__link"
      :aria-labelledby="`note-card-title-${note.id}`"
      draggable="false"
      @click.capture="preventSelectionNavigation"
    >
      <div class="note-card__heading">
        <span
          class="project-progress"
          :style="{ '--progress': `${progress * 360}deg` }"
          aria-hidden="true"
        >
          <AppIcon v-if="progress === 1" name="check" :size="13" />
        </span>
        <h2 :id="`note-card-title-${note.id}`">{{ note.title }}</h2>
        <span class="note-card__date">{{ date }}</span>
      </div>
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
      <p v-else class="note-card__empty">Пока без задач</p>
      <div class="note-card__bottom">
        <span>
          {{
            note.todos.length
              ? `${completed} из ${note.todos.length} выполнено`
              : 'Добавьте первый шаг'
          }}
        </span>
        <span v-if="note.todos.length > 3" class="note-card__more">
          Ещё {{ note.todos.length - 3 }}
        </span>
        <span class="note-card__open" aria-hidden="true">
          Открыть
          <AppIcon name="arrow" :size="15" />
        </span>
      </div>
    </NuxtLink>
    <button
      class="icon-button note-card__delete"
      :aria-label="`Удалить заметку «${note.title}»`"
      @click="$emit('delete', note.id)"
    >
      <AppIcon name="trash" :size="16" />
    </button>
  </article>
</template>
