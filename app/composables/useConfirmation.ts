import { onScopeDispose, ref } from 'vue'

export interface ConfirmationOptions {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}
export function useConfirmation() {
  const options = ref<ConfirmationOptions | null>(null)
  let resolve: ((value: boolean) => void) | null = null
  function settle(value: boolean): void {
    options.value = null
    resolve?.(value)
    resolve = null
  }
  function ask(value: ConfirmationOptions): Promise<boolean> {
    settle(false)
    options.value = value
    return new Promise<boolean>((done) => {
      resolve = done
    })
  }
  onScopeDispose(() => settle(false))
  return { options, ask, settle }
}
