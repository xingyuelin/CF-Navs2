import { describe, expect, it } from 'vitest'
import { withAssetCacheHeaders } from '../../worker/lib/assetHeaders'

function applyHeaders(pathname: string, response: Response): Response {
  return withAssetCacheHeaders(new Request(`https://example.com${pathname}`), response)
}

describe('asset response headers', () => {
  it('adds no-cache and security headers to html responses', async () => {
    const response = applyHeaders('/', new Response('<!doctype html>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }))

    expect(response.headers.get('Cache-Control')).toBe('no-cache, max-age=0, must-revalidate')
    expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'")
    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
    expect(await response.text()).toBe('<!doctype html>')
  })

  it('keeps immutable cache headers on hashed assets', () => {
    const response = applyHeaders('/assets/app.js', new Response('console.log(1)'))

    expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
    expect(response.headers.get('Content-Security-Policy')).toBeNull()
  })

  it('adds short cache headers to browser icon assets', () => {
    expect(applyHeaders('/icon.ico', new Response('ico')).headers.get('Cache-Control')).toBe('public, max-age=86400')
    expect(applyHeaders('/icon.png', new Response('png')).headers.get('Cache-Control')).toBe('public, max-age=86400')
  })

  it('does not override cache headers on failed asset responses', () => {
    const response = applyHeaders('/assets/missing.js', new Response('missing', {
      status: 404,
      headers: { 'Cache-Control': 'private' },
    }))

    expect(response.headers.get('Cache-Control')).toBe('private')
  })
  it('ships static asset header rules for Cloudflare asset uploads', async () => {
    const headersFile = await import('node:fs/promises').then(({ readFile }) => readFile('public/_headers', 'utf8'))

    expect(headersFile).toContain('/assets/*')
    expect(headersFile).toContain('Cache-Control: public, max-age=31536000, immutable')
    expect(headersFile).toContain('/icon.ico')
    expect(headersFile).toContain('/icon.png')
    expect(headersFile).toContain('/sw.js')
    expect(headersFile).toContain('Cache-Control: no-cache, max-age=0, must-revalidate')
  })
})
