import type { LoginResp } from '../../shared/types'
import { generateToken } from './crypto'
import { cacheValidatedSession, getSessionKey } from '../middleware/auth'
import type { Env, SessionValue } from '../types'

const DEFAULT_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60

export function getSessionTtlSeconds(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SESSION_TTL_SECONDS
}

export async function createSession(env: Env, username: string): Promise<LoginResp> {
  const ttlSeconds = getSessionTtlSeconds(env.SESSION_TTL)
  const expires_at = Date.now() + ttlSeconds * 1000
  const token = generateToken()
  const session: SessionValue = { username, exp: expires_at }

  await env.SESSION.put(getSessionKey(token), JSON.stringify(session), { expirationTtl: ttlSeconds })
  cacheValidatedSession(token, session)

  return { token, expires_at, username }
}
