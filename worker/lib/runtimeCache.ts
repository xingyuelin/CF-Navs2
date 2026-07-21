import type { AdminData } from '../../shared/types'

const ADMIN_DATA_MEMORY_TTL_MS = 3000

type RuntimeCacheEntry<T> = {
  data: T
  expiresAt: number
}

let adminDataCache: RuntimeCacheEntry<AdminData> | null = null

export function getCachedAdminData(now = Date.now()): AdminData | null {
  if (!adminDataCache) return null
  if (adminDataCache.expiresAt <= now) {
    adminDataCache = null
    return null
  }

  return adminDataCache.data
}

export function setCachedAdminData(data: AdminData, now = Date.now()): void {
  adminDataCache = {
    data,
    expiresAt: now + ADMIN_DATA_MEMORY_TTL_MS,
  }
}

export function invalidateRuntimeDataCache(): void {
  adminDataCache = null
}
