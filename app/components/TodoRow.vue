<script setup lang="ts">
import type { Todo } from '../domain/notes'
defineProps<{ todo: Todo; invalid?: boolean; number: number; readonly?: boolean }>()
const emit = defineEmits<{ text: [value: string]; toggle: []; remove: []; blur: []; enter: [] }>()
function input(event: Event): void {
  emit('text', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <li class="todo-row" :class="{ 'todo-row--done': todo.done, 'todo-row--invalid': invalid }">
    <label class="todo-row__check">
      <input
        type="checkbox"
        :disabled="readonly"
        :checked="todo.done"
        :aria-label="`Отметить задачу ${number}: ${todo.text || 'без текста'}`"
        @change="emit('toggle')"
      />
      <span aria-hidden="true"><AppIcon v-if="todo.done" name="check" :size="15" /></span>
    </label>
    <div class="todo-row__field">
      <label class="sr-only" :for="`todo-${todo.id}`">Текст задачи {{ number }}</label>
      <input
        :id="`todo-${todo.id}`"
        :readonly="readonly"
        :value="todo.text"
        placeholder="Что нужно сделать?"
        maxlength="1000"
        :aria-invalid="invalid || undefined"
        :aria-describedby="invalid ? 'validation-error' : undefined"
        autocomplete="off"
        @input="input"
        @blur="emit('blur')"
        @keydown.enter.prevent="!readonly && emit('enter')"
      />
    </div>
    <button
      type="button"
      class="icon-button todo-row__remove"
      :disabled="readonly"
      :aria-label="`Удалить задачу ${number}`"
      @click="emit('remove')"
    >
      <AppIcon name="close" :size="17" />
    </button>
  </li>
</template>
