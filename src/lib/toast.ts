import { writable } from 'svelte/store'

export type ToastType = 'success' | 'error' | 'info'

export const TOAST_DURATIONS: Record<ToastType, number> = {
  success: 3000,
  info: 4000,
  error: 8000,
}

export type ToastItem = {
  id: string
  type: ToastType
  message: string
}

export type ToastOptions = {
  duration?: number | null
}

export type ToastStore = {
  subscribe: ReturnType<typeof writable<ToastItem[]>>['subscribe']
  addToast: (message: string, type?: ToastType, options?: ToastOptions) => string
  dismissToast: (id: string) => void
}

export function createToastStore(): ToastStore {
  const { subscribe, update } = writable<ToastItem[]>([])
  let nextId = 0
  const timers = new Map<string, ReturnType<typeof setTimeout>>()

  function resolveDuration(type: ToastType, options?: ToastOptions): number {
    if (options && 'duration' in options) {
      return Math.max(0, options.duration ?? 0)
    }

    return TOAST_DURATIONS[type]
  }

  function clearToastTimer(id: string): void {
    const timer = timers.get(id)
    if (!timer) return

    clearTimeout(timer)
    timers.delete(id)
  }

  function removeToast(id: string): void {
    update((items) => items.filter((item) => item.id !== id))
  }

  function addToast(message: string, type: ToastType = 'info', options?: ToastOptions): string {
    const id = `toast-${++nextId}-${Date.now()}`
    const item: ToastItem = { id, type, message }
    update((items) => [...items, item])

    const duration = resolveDuration(type, options)
    if (duration > 0) {
      const timer = setTimeout(() => {
        timers.delete(id)
        removeToast(id)
      }, duration)
      timers.set(id, timer)
    }

    return id
  }

  function dismissToast(id: string): void {
    clearToastTimer(id)
    removeToast(id)
  }

  return { subscribe, addToast, dismissToast }
}

export const toastStore = createToastStore()
