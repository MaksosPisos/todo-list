<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import type { ConfirmationOptions } from '../composables/useConfirmation'

const props = defineProps<{ options: ConfirmationOptions | null }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)
const titleId = useId()
const descriptionId = useId()
let previousFocus: HTMLElement | null = null

async function syncDialog(): Promise<void> {
  await nextTick()
  if (props.options && dialog.value && !dialog.value.open) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog.value.showModal()
    dialog.value.querySelector<HTMLButtonElement>('[data-initial-focus]')?.focus()
  } else if (!props.options && dialog.value?.open) {
    dialog.value.close()
    previousFocus?.focus()
  }
}
function trapFocus(event: KeyboardEvent): void {
  if (event.key !== 'Tab') return
  const targets = dialog.value?.querySelectorAll<HTMLButtonElement>('button:not([disabled])')
  if (!targets?.length) {
    event.preventDefault()
    return
  }
  const first = targets[0]
  const last = targets[targets.length - 1]
  if (
    event.shiftKey &&
    (document.activeElement === first || document.activeElement === dialog.value)
  ) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}
watch(() => props.options, syncDialog)
onMounted(syncDialog)
onBeforeUnmount(() => {
  dialog.value?.close()
  previousFocus?.focus()
})
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="modal"
      :aria-labelledby="titleId"
      :aria-describedby="descriptionId"
      @cancel.prevent="emit('cancel')"
      @keydown="trapFocus"
    >
      <template v-if="options">
        <div class="modal__symbol" :class="{ 'modal__symbol--danger': options.danger }">
          <AppIcon :name="options.danger ? 'warning' : 'note'" :size="26" />
        </div>
        <h2 :id="titleId">{{ options.title }}</h2>
        <p :id="descriptionId">{{ options.description }}</p>
        <div class="modal__actions">
          <button
            class="button button--secondary"
            data-initial-focus
            autofocus
            @click="emit('cancel')"
          >
            {{ options.cancelLabel || 'Оставить' }}
          </button>
          <button
            class="button"
            :class="options.danger ? 'button--danger' : 'button--primary'"
            @click="emit('confirm')"
          >
            {{ options.confirmLabel || 'Подтвердить' }}
          </button>
        </div>
      </template>
    </dialog>
  </Teleport>
</template>
