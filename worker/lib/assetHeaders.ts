const IMMUTABLE_ASSET_CACHE = 'public, max-age=31536000, immutable'
const REVALIDATE_CACHE = 'no-cache, max-age=0, must-revalidate'
const SHORT_STATIC_CACHE = 'public, max-age=86400'

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join('; ')

export function setSecurityHeaders(headers: Headers): void {
  headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY)
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
}

export function withAssetCacheHeaders(request: Request, response: Response): Response {
  const url = new URL(request.url)
  const headers = new Headers(response.headers)
  const contentType = headers.get('Content-Type') ?? ''
  const isHtml =
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    contentType.includes('text/html')

  if (response.ok) {
    if (isHtml || url.pathname === '/sw.js') {
      headers.set('Cache-Control', REVALIDATE_CACHE)
    } else if (url.pathname.startsWith('/assets/')) {
      headers.set('Cache-Control', IMMUTABLE_ASSET_CACHE)
    } else if (
      url.pathname === '/manifest.webmanifest' ||
      url.pathname === '/icon.ico' ||
      url.pathname === '/icon.png'
    ) {
      headers.set('Cache-Control', SHORT_STATIC_CACHE)
    }

    if (isHtml) {
      setSecurityHeaders(headers)
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
