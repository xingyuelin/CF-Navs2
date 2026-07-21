export type LazyComponentModule<T> = {
  default: T
}

export type LazyComponentOptions<T> = {
  load: () => Promise<LazyComponentModule<T>>
  getCurrent: () => T | null
  setCurrent: (component: T) => void
}

export function createLazyComponentLoader<T>({
  load,
  getCurrent,
  setCurrent,
}: LazyComponentOptions<T>): () => Promise<void> {
  let pending: Promise<void> | null = null

  return function ensureLazyComponent(): Promise<void> {
    if (getCurrent()) return Promise.resolve()

    if (!pending) {
      pending = load()
        .then((module) => {
          setCurrent(module.default)
        })
        .finally(() => {
          pending = null
        })
    }

    return pending
  }
}
