import type { MiddlewareHandler } from 'hono'
import { ErrCode } from '../../shared/types'
import { fail } from '../lib/response'
import type { Env, HonoEnv, SessionValue } from '../types'

const SESSION_PREFIX = 'sess:'
const SESSION_MEMORY_CACHE_TTL_MS = 15_000
const SESSION_MEMORY_CACHE_MAX = 256

type CachedSession = {
  session: SessionValue
  expiresAt: number
}

const sessionMemoryCache = new Map<string, CachedSession>()

export function extractBearerToken(authorization: string | undefined | null): string | null {
  if (!authorization) return null
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  const token = match?.[1]?.trim()
  return token ? token : null
}

export function getSessionKey(token: string): string {
  return `${SESSION_PREFIX}${token}`
}

function pruneSessionMemoryCache(now = Date.now()): void {
  for (const [token, cached] of sessionMemoryCache) {
    if (cached.expiresAt <= now || cached.session.exp <= now) {
      sessionMemoryCache.delete(token)
    }
  }

  while (sessionMemoryCache.size > SESSION_MEMORY_CACHE_MAX) {
    const oldest = sessionMemoryCache.keys().next().value as string | undefined
    if (!oldest) break
    sessionMemoryCache.delete(oldest)
  }
}

export function cacheValidatedSession(token: string, session: SessionValue): void {
  const now = Date.now()
  if (!session.username || typeof session.exp !== 'number' || session.exp <= now) {
    sessionMemoryCache.delete(token)
    return
  }

  sessionMemoryCache.set(token, {
    session,
    expiresAt: Math.min(session.exp, now + SESSION_MEMORY_CACHE_TTL_MS),
  })
  pruneSessionMemoryCache(now)
}

export function clearCachedSession(token: string): void {
  sessionMemoryCache.delete(token)
}

export function clearAllCachedSessions(): void {
  sessionMemoryCache.clear()
}

export async function clearAllSessions(env: Env): Promise<void> {
  let cursor: string | undefined

  do {
    const page = await env.SESSION.list({ prefix: SESSION_PREFIX, cursor })
    await Promise.all(page.keys.map((key) => env.SESSION.delete(key.name)))
    cursor = page.list_complete ? undefined : page.cursor
  } while (cursor)
}

export async function validateSession(env: Env, token: string): Promise<SessionValue | null> {
  const now = Date.now()
  const cached = sessionMemoryCache.get(token)
  if (cached && cached.expiresAt > now && cached.session.exp > now) {
    return cached.session
  }
  if (cached) {
    sessionMemoryCache.delete(token)
  }

  const raw = await env.SESSION.get(getSessionKey(token))
  if (!raw) return null

  let session: SessionValue
  try {
    session = JSON.parse(raw) as SessionValue
  } catch {
    await env.SESSION.delete(getSessionKey(token))
    sessionMemoryCache.delete(token)
    return null
  }

  if (!session.username || typeof session.exp !== 'number' || session.exp <= Date.now()) {
    await env.SESSION.delete(getSessionKey(token))
    sessionMemoryCache.delete(token)
    return null
  }

  cacheValidatedSession(token, session)
  return session
}

export const authRequired: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const token = extractBearerToken(c.req.header('Authorization'))
  if (!token) {
    return c.json(fail(ErrCode.UNAUTHORIZED, 'unauthorized'), 401)
  }

  const session = await validateSession(c.env, token)
  if (!session) {
    return c.json(fail(ErrCode.UNAUTHORIZED, 'unauthorized'), 401)
  }

  c.set('username', session.username)
  await next()
}
