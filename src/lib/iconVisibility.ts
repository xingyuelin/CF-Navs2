type IconVisibilityCallback = () => void

const iconVisibilityCallbacks = new WeakMap<Element, IconVisibilityCallback>()
let sharedIconObserver: IntersectionObserver | null = null

function getSharedIconObserver(): IntersectionObserver | null {
  if (typeof IntersectionObserver === 'undefined') return null

  if (!sharedIconObserver) {
    sharedIconObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue

        const callback = iconVisibilityCallbacks.get(entry.target)
        iconVisibilityCallbacks.delete(entry.target)
        sharedIconObserver?.unobserve(entry.target)
        callback?.()
      }
    }, {
      root: null,
      rootMargin: '420px 0px',
      threshold: 0,
    })
  }

  return sharedIconObserver
}

export function observeIconVisibility(element: Element, callback: IconVisibilityCallback): () => void {
  const observer = getSharedIconObserver()
  if (!observer) {
    callback()
    return () => undefined
  }

  iconVisibilityCallbacks.set(element, callback)
  observer.observe(element)

  return () => {
    iconVisibilityCallbacks.delete(element)
    observer.unobserve(element)
  }
}
