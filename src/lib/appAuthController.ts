import { createHomeGateState, type AppView } from './appNavigation'

export interface AuthUIRegion {
  loginModalOpen: boolean
  currentView: AppView | null
}

/**
 * Target UI state after clicking "open login" button.
 * Always opens the modal; changes view to 'login' only when the home is not visible.
 */
export function targetAfterLoginOpen(canSeeHome: boolean, currentView: AppView): AuthUIRegion {
  return {
    loginModalOpen: true,
    currentView: canSeeHome ? null : 'login',
  }
}

/**
 * Target UI state after closing the login modal.
 * On a private site the modal must stay open and force 'login' view.
 * On a public site the modal closes without changing the current view.
 */
export function targetAfterLoginClose(canSeeHome: boolean): AuthUIRegion {
  if (!canSeeHome) {
    return { loginModalOpen: true, currentView: 'login' }
  }
  return { loginModalOpen: false, currentView: null }
}

/**
 * Target UI state after a successful login.
 */
export function targetAfterLoginSuccess(): AuthUIRegion {
  return { loginModalOpen: false, currentView: 'home' }
}

/**
 * Target UI state after logout completes.
 * Delegates home-gate resolution (public vs private) to appNavigation.
 */
export function targetAfterLogout(publicMode: boolean | undefined): AuthUIRegion {
  const homeGate = createHomeGateState({
    publicMode,
    authenticated: false,
  })
  return { loginModalOpen: homeGate.loginModalOpen, currentView: homeGate.view }
}

/**
 * Target UI state after a password change.
 */
export function targetAfterPasswordChange(): AuthUIRegion {
  return { loginModalOpen: true, currentView: 'login' }
}

/**
 * Which modal/state regions should be reset when auth changes
 * (logout / password change).
 */
export interface AuthResetMask {
  resetCategories: boolean
  resetBookmarks: boolean
  resetSettings: boolean
  resetAdminStore: boolean
  clearAdminCache: boolean
}

export function getAuthResetMask(): AuthResetMask {
  return {
    resetCategories: true,
    resetBookmarks: true,
    resetSettings: true,
    resetAdminStore: true,
    clearAdminCache: true,
  }
}

/**
 * Applies an AuthUIRegion to mutable primitives.
 * Returns a partial with non-null fields so the caller can assign only what changed.
 */
export function applyAuthUIRegion(
  region: AuthUIRegion,
): { loginModalOpen: boolean; currentView?: AppView } {
  const result: { loginModalOpen: boolean; currentView?: AppView } = {
    loginModalOpen: region.loginModalOpen,
  }
  if (region.currentView !== null) {
    result.currentView = region.currentView
  }
  return result
}
