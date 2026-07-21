import type { InstallBinding, InstallStatusResp } from '../../shared/types'

export type InstallRoute = 'install' | 'app'

const INSTALLED_HINT_KEY = 'cf-navs:installed'
const INSTALLED_HINT_VALUE = '1'

export type PendingInstallStatus = Exclude<InstallStatusResp, { state: 'installed' }>

export type InstallScreenState =
  | { type: 'checking' }
  | { type: 'pending'; status: PendingInstallStatus; error?: string }
  | { type: 'installing'; status: Extract<PendingInstallStatus, { state: 'needs_install' }> }
  | { type: 'status_error'; message: string }

export interface InstallViewState {
  mode:
    | 'needs_install'
    | 'setup_token_missing'
    | 'bindings_missing'
    | 'database_unreachable'
    | 'session_store_unreachable'
    | 'status_error'
  missingBindings: InstallBinding[]
  schemaVersion: number | null
  installing: boolean
  error: string
}

export function isInstallPath(pathname: string): boolean {
  return pathname === '/install' || pathname.startsWith('/install/')
}

export function getInstallRoute(status: InstallStatusResp): InstallRoute {
  return status.state === 'installed' ? 'app' : 'install'
}

export function toInstallScreenState(status: PendingInstallStatus): InstallScreenState {
  return { type: 'pending', status }
}

export function getInstallViewState(state: InstallScreenState): InstallViewState | null {
  if (state.type === 'checking') return null
  if (state.type === 'status_error') {
    return {
      mode: 'status_error',
      missingBindings: [],
      schemaVersion: null,
      installing: false,
      error: state.message,
    }
  }

  const status = state.status
  if (status.state === 'needs_install') {
    return {
      mode: 'needs_install',
      missingBindings: [],
      schemaVersion: status.schema_version,
      installing: state.type === 'installing',
      error: state.type === 'pending' ? state.error ?? '' : '',
    }
  }
  if (status.state === 'configuration_required') {
    return {
      mode: 'setup_token_missing',
      missingBindings: [],
      schemaVersion: status.schema_version,
      installing: false,
      error: state.type === 'pending' ? state.error ?? '' : '',
    }
  }
  if (status.state === 'bindings_missing') {
    return {
      mode: 'bindings_missing',
      missingBindings: status.missing,
      schemaVersion: null,
      installing: false,
      error: state.type === 'pending' ? state.error ?? '' : '',
    }
  }

  return {
    mode: status.reason,
    missingBindings: [],
    schemaVersion: null,
    installing: false,
    error: state.type === 'pending' ? state.error ?? '' : '',
  }
}

export function hasInstalledHint(storage: Pick<Storage, 'getItem'> | null | undefined): boolean {
  if (!storage) return false

  try {
    return storage.getItem(INSTALLED_HINT_KEY) === INSTALLED_HINT_VALUE
  } catch {
    return false
  }
}

export function setInstalledHint(
  storage: Pick<Storage, 'setItem' | 'removeItem'> | null | undefined,
  installed: boolean,
): void {
  if (!storage) return

  try {
    if (installed) {
      storage.setItem(INSTALLED_HINT_KEY, INSTALLED_HINT_VALUE)
    } else {
      storage.removeItem(INSTALLED_HINT_KEY)
    }
  } catch {
    // Browser storage can be unavailable; the status probe remains authoritative.
  }
}

export function canUseInstalledFallback(status: InstallStatusResp, installedHint: boolean): boolean {
  return installedHint && status.state === 'unavailable'
}

export async function installationCommittedAfterFailure(
  getStatus: () => Promise<InstallStatusResp>,
): Promise<boolean> {
  try {
    return (await getStatus()).state === 'installed'
  } catch {
    return false
  }
}

export function replaceBrowserPath(pathname: string): void {
  if (typeof window === 'undefined' || window.location.pathname === pathname) {
    return
  }

  window.history.replaceState(null, '', `${pathname}${window.location.search}${window.location.hash}`)
}

export function normalizeInstallError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return '无法连接安装服务，请检查网络后重试。'
}
