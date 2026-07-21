import type { ThemeMode } from '../../shared/types'

export type ActiveTheme = 'light' | 'dark'

export type AppThemeStateInput = {
  preferredThemeMode: ThemeMode | null
  configuredThemeMode: ThemeMode | null | undefined
  systemPrefersDark: boolean
}

export type AppThemeState = {
  configuredThemeMode: ThemeMode
  themeMode: ThemeMode
  activeTheme: ActiveTheme
}

export function resolveAppThemeState({
  preferredThemeMode,
  configuredThemeMode,
  systemPrefersDark,
}: AppThemeStateInput): AppThemeState {
  const configuredTheme = configuredThemeMode ?? 'auto'
  const themeMode = preferredThemeMode ?? configuredTheme

  return {
    configuredThemeMode: configuredTheme,
    themeMode,
    activeTheme: themeMode === 'auto'
      ? systemPrefersDark ? 'dark' : 'light'
      : themeMode,
  }
}

export function getNextThemePreference(themeMode: ThemeMode): ThemeMode {
  if (themeMode === 'light') return 'dark'
  if (themeMode === 'dark') return 'auto'
  return 'light'
}
