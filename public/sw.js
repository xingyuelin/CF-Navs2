// CF-Navs service worker.
// Strategy:
// - App shell and hashed assets: cache first.
// - Navigations: network first with cached index.html fallback.
// - /api/category-icon/*: cache first because category icons are low volume.
// - /api/icon/* and /api/iconify/*: do not write to Cache Storage; rely on HTTP and edge caching.
// - Other /api/* requests: network only.

const CACHE = 'cf-navs-v14'
const RUNTIME_CACHE_PREFIX = 'cf-navs-v'
const APP_SHELL = ['/index.html', '/manifest.webmanifest', '/icon.ico', '/icon.png']
const ICON_FALLBACK_TTL_MS = 5 * 60 * 1000
const ICON_FALLBACK_CACHED_AT = 'X-CF-Navs-Fallback-Cached-At'
const MAX_ICON_CACHE_BYTES = 512 * 1024

function cacheResponse(request, response) {
  if (!response.ok) return

  const copy = response.clone()
  caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined)
}

function isIconFallback(response) {
  return response.headers.get('X-Icon-Fallback') === '1'
}

function fallbackResponseForCache(response) {
  const headers = new Headers(response.headers)
  headers.set(ICON_FALLBACK_CACHED_AT, String(Date.now()))
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

async function matchCachedIcon(request) {
  const cached = await caches.match(request)
  if (!cached) return null

  if (!isIconFallback(cached)) {
    return cached
  }

  const cachedAt = Number(cached.headers.get(ICON_FALLBACK_CACHED_AT) || '0')
  if (cachedAt > 0 && Date.now() - cachedAt <= ICON_FALLBACK_TTL_MS) {
    return cached
  }

  caches.open(CACHE).then((cache) => cache.delete(request)).catch(() => undefined)
  return null
}

function cacheIconResponse(request, response) {
  if (!response.ok) return
  if (response.type === 'opaque') return

  const contentLength = Number(response.headers.get('Content-Length') || '0')
  if (contentLength > MAX_ICON_CACHE_BYTES) return

  const copy = response.clone()
  const cached = isIconFallback(copy) ? fallbackResponseForCache(copy) : copy
  caches.open(CACHE).then((cache) => cache.put(request, cached)).catch(() => undefined)
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(() => undefined),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(RUNTIME_CACHE_PREFIX) && key !== CACHE)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  const isIconifyAsset =
    url.protocol === 'https:' &&
    url.hostname === 'api.iconify.design' &&
    url.pathname.endsWith('.svg')
  if (isIconifyAsset) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            cacheIconResponse(request, response)
            return response
          }),
      ),
    )
    return
  }

  if (url.origin !== self.location.origin) return

  const isCategoryIconProxy = url.pathname.startsWith('/api/category-icon/')
  if (isCategoryIconProxy) {
    event.respondWith(
      matchCachedIcon(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            cacheIconResponse(request, response)
            return response
          }),
      ),
    )
    return
  }

  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
            cacheResponse('/index.html', response)
          }
          return response
        })
        .catch(() => caches.match('/index.html').then((cached) => cached || caches.match('/'))),
    )
    return
  }

  const isStatic = url.pathname.startsWith('/assets/') || APP_SHELL.includes(url.pathname)
  if (isStatic) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            cacheResponse(request, response)
            return response
          }),
      ),
    )
  }
})
