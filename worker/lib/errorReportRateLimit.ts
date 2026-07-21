import type { Env } from '../types'

const MAX_REQUESTS = 12
const WINDOW_MS = 60_000
const BLOCKED_MEMORY_MAX = 512
const blockedUntil = new Map<string, number>()

function pruneBlocked(now: number): void {
  for (const [ip, expiresAt] of blockedUntil) {
    if (expiresAt <= now) blockedUntil.delete(ip)
  }
  while (blockedUntil.size > BLOCKED_MEMORY_MAX) {
    const oldest = blockedUntil.keys().next().value as string | undefined
    if (!oldest) break
    blockedUntil.delete(oldest)
  }
}

export function clearErrorReportRateLimitMemory(): void {
  blockedUntil.clear()
}

export async function consumeErrorReportQuota(env: Env, ip: string, now = Date.now()): Promise<boolean> {
  const clientKey = ip || 'unknown'
  pruneBlocked(now)
  if ((blockedUntil.get(clientKey) ?? 0) > now) return false

  const resetAt = now + WINDOW_MS
  const row = await env.DB.prepare(`
    INSERT INTO error_report_rate_limits (client_key, count, reset_at)
    VALUES (?, 1, ?)
    ON CONFLICT(client_key) DO UPDATE SET
      count = CASE WHEN reset_at <= ? THEN 1 ELSE count + 1 END,
      reset_at = CASE WHEN reset_at <= ? THEN excluded.reset_at ELSE reset_at END
    RETURNING count, reset_at
  `).bind(clientKey, resetAt, now, now).first<{ count: number; reset_at: number }>()

  if (!row || row.count > MAX_REQUESTS) {
    blockedUntil.set(clientKey, row?.reset_at ?? resetAt)
    return false
  }
  return true
}
