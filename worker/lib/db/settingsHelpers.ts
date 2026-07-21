import { type Settings } from '../../../shared/types'
import { SETTINGS_KEYS } from '../../../shared/settings'

// Pure helpers extracted from db/settings.ts to enable unit testing
// without D1 database dependencies.

export function createDataVersion(): string {
  const random = new Uint32Array(2)
  crypto.getRandomValues(random)
  return `${Date.now().toString(36)}-${random[0].toString(36)}${random[1].toString(36)}`
}

export function buildSettingsPatchParams(patch: Partial<Settings>): { placeholders: string; params: unknown[] } | null {
  const keys: string[] = []
  const params: unknown[] = []

  for (const key of SETTINGS_KEYS) {
    if (key in patch && patch[key] !== undefined) {
      keys.push('(?, ?)')
      params.push(key, JSON.stringify(patch[key]))
    }
  }

  if (keys.length === 0) return null

  return {
    placeholders: keys.join(', '),
    params,
  }
}
