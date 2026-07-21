import type { ThemeMode } from '../../shared/types'

const THEME_STORAGE_KEY = 'cf-navs.theme-mode'

export function readPreferredThemeMode(): ThemeMode | null {
  if (typeof localStorage === 'undefined') return null
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  return stored === 'light' || stored === 'dark' || stored === 'auto' ? stored : null
}

export function writePreferredThemeMode(mode: ThemeMode): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(THEME_STORAGE_KEY, mode)
  }
}
