import { Hono } from 'hono'
import type { Context } from 'hono'
import { ErrCode, type FaviconResp } from '../../shared/types'
import { fail, ok } from '../lib/response'
import type { HonoEnv } from '../types'

type AppContext = Context<HonoEnv>
type PageFetchResult = {
  html: string | null
  finalUrl: string
}

const HTML_ACCEPT = 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1'
const ICON_ACCEPT = 'image/avif,image/webp,image/apng,image/*,*/*;q=0.1'
const MAX_HTML_LENGTH = 256_000
const FETCH_TIMEOUT_MS = 3000
const OVERALL_DEADLINE_MS = 6000

function badRequest(c: AppContext, msg: string) {
  return c.json(fail(ErrCode.BAD_REQUEST, msg))
}

// 带超时的 fetch：避免某个上游连接挂起导致整个请求长时间卡住。
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function parseTargetUrl(raw: string | null): URL | null {
  if (!raw) return null

  const value = raw.trim()
  if (!value) return null

  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
      return null
    }
    return url
  } catch {
    return null
  }
}

function extractAttribute(tag: string, name: string): string | null {
  const pattern = new RegExp(name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s"\'=<>`]+))', 'i')
  const match = tag.match(pattern)
  const value = match?.[1] ?? match?.[2] ?? match?.[3]
  return value?.trim() || null
}

function resolveHttpUrl(raw: string, baseUrl: string): string | null {
  try {
    const url = new URL(raw, baseUrl)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
}

function extractIconCandidates(html: string, baseUrl: string): string[] {
  const matches = html.match(/<link\b[^>]*>/gi) ?? []
  const seen = new Set<string>()
  const candidates: string[] = []

  for (const tag of matches) {
    const rel = extractAttribute(tag, 'rel')
    const href = extractAttribute(tag, 'href')
    if (!rel || !href || !/\bicon\b/i.test(rel)) {
      continue
    }

    const resolved = resolveHttpUrl(href, baseUrl)
    if (!resolved || seen.has(resolved)) {
      continue
    }

    seen.add(resolved)
    candidates.push(resolved)
  }

  return candidates
}

async function fetchPageHtml(url: string): Promise<PageFetchResult | null> {
  try {
    const response = await fetchWithTimeout(url, {
      redirect: 'follow',
      headers: {
        Accept: HTML_ACCEPT,
      },
    })

    const finalUrl = response.url || url
    if (!response.ok) {
      return { html: null, finalUrl }
    }

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return { html: null, finalUrl }
    }

    const html = await response.text()
    return { html: html.slice(0, MAX_HTML_LENGTH), finalUrl }
  } catch {
    return null
  }
}

async function canFetchIcon(url: string): Promise<boolean> {
  try {
    const headResponse = await fetchWithTimeout(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        Accept: ICON_ACCEPT,
      },
    })

    if (headResponse.ok) {
      return true
    }

    if (headResponse.status !== 403 && headResponse.status !== 405) {
      return false
    }
  } catch {
    // Some hosts reject or mishandle HEAD; fall through to a tiny GET probe.
  }

  try {
    const getResponse = await fetchWithTimeout(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        Accept: ICON_ACCEPT,
        Range: 'bytes=0-0',
      },
    })

    return getResponse.ok
  } catch {
    return false
  }
}

function buildGoogleFallback(hostname: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`
}

export const faviconRoutes = new Hono<HonoEnv>()

faviconRoutes.get('/fetch-favicon', async (c) => {
  const targetUrl = parseTargetUrl(new URL(c.req.url).searchParams.get('url'))
  if (!targetUrl) {
    return badRequest(c, 'invalid url')
  }

  // 解析逻辑：站内 <link> → /favicon.ico → Google 兜底。
  async function resolveIcon(): Promise<string> {
    let fallbackOrigin = targetUrl!.origin
    let fallbackHostname = targetUrl!.hostname

    const page = await fetchPageHtml(targetUrl!.toString())
    if (page) {
      const finalUrl = new URL(page.finalUrl)
      fallbackOrigin = finalUrl.origin
      fallbackHostname = finalUrl.hostname

      if (page.html) {
        const candidates = extractIconCandidates(page.html, page.finalUrl).slice(0, 6)
        for (const candidate of candidates) {
          if (await canFetchIcon(candidate)) {
            return candidate
          }
        }
      }
    }

    const originFavicon = `${fallbackOrigin}/favicon.ico`
    if (await canFetchIcon(originFavicon)) {
      return originFavicon
    }

    return buildGoogleFallback(fallbackHostname)
  }

  try {
    // 整体兜底：无论解析链多慢，最多 OVERALL_DEADLINE_MS 后返回 Google 兜底，
    // 避免前端「一键获取」按钮长时间转圈。
    const deadline = new Promise<string>((resolve) =>
      setTimeout(() => resolve(buildGoogleFallback(targetUrl!.hostname)), OVERALL_DEADLINE_MS),
    )
    const icon = await Promise.race([resolveIcon(), deadline])
    return c.json(ok<FaviconResp>({ icon }))
  } catch {
    // 任何异常也回退到 Google 兜底，保证总能给出一个可用图标
    return c.json(ok<FaviconResp>({ icon: buildGoogleFallback(targetUrl.hostname) }))
  }
})

export default faviconRoutes
