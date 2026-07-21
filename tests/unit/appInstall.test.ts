import { describe, expect, it } from 'vitest'
import {
  canUseInstalledFallback,
  getInstallRoute,
  getInstallViewState,
  hasInstalledHint,
  installationCommittedAfterFailure,
  isInstallPath,
  normalizeInstallError,
  setInstalledHint,
  toInstallScreenState,
} from '../../src/lib/appInstall'

describe('app installation helpers', () => {
  it('routes only installed deployments to the application', () => {
    expect(getInstallRoute({ state: 'installed', schema_version: 1 })).toBe('app')
    expect(getInstallRoute({
      state: 'needs_install',
      schema_version: null,
      setup_token_configured: true,
    })).toBe('install')
  })

  it('maps every incomplete status to actionable install guidance', () => {
    expect(getInstallViewState(toInstallScreenState({
      state: 'configuration_required',
      reason: 'setup_token_missing',
      schema_version: null,
    }))?.mode).toBe('setup_token_missing')
    expect(getInstallViewState(toInstallScreenState({
      state: 'bindings_missing',
      missing: ['DB', 'SESSION'],
    }))).toMatchObject({
      mode: 'bindings_missing',
      missingBindings: ['DB', 'SESSION'],
    })
    expect(getInstallViewState(toInstallScreenState({
      state: 'unavailable',
      reason: 'database_unreachable',
    }))?.mode).toBe('database_unreachable')
    expect(getInstallViewState(toInstallScreenState({
      state: 'needs_install',
      schema_version: 1,
      setup_token_configured: true,
    }))).toMatchObject({ mode: 'needs_install', schemaVersion: 1 })
  })

  it('recognizes the dedicated install path without matching similarly named paths', () => {
    expect(isInstallPath('/install')).toBe(true)
    expect(isInstallPath('/install/')).toBe(true)
    expect(isInstallPath('/install/retry')).toBe(true)
    expect(isInstallPath('/installation')).toBe(false)
    expect(isInstallPath('/')).toBe(false)
  })

  it('persists only a confirmed installed hint and uses it for transient outages', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    }

    expect(hasInstalledHint(storage)).toBe(false)
    setInstalledHint(storage, true)
    expect(hasInstalledHint(storage)).toBe(true)
    expect(canUseInstalledFallback({
      state: 'unavailable',
      reason: 'session_store_unreachable',
    }, true)).toBe(true)
    expect(canUseInstalledFallback({
      state: 'needs_install',
      schema_version: null,
      setup_token_configured: true,
    }, true)).toBe(false)
    setInstalledHint(storage, false)
    expect(hasInstalledHint(storage)).toBe(false)
  })

  it('detects credentials committed before session creation failed', async () => {
    await expect(installationCommittedAfterFailure(async () => ({
      state: 'installed',
      schema_version: 1,
    }))).resolves.toBe(true)
    await expect(installationCommittedAfterFailure(async () => ({
      state: 'needs_install',
      schema_version: null,
      setup_token_configured: true,
    }))).resolves.toBe(false)
    await expect(installationCommittedAfterFailure(async () => {
      throw new Error('status unavailable')
    })).resolves.toBe(false)
  })

  it('tolerates unavailable browser storage for the installed hint', () => {
    const storage = {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
      removeItem: () => { throw new Error('blocked') },
    }

    expect(hasInstalledHint(storage)).toBe(false)
    expect(() => setInstalledHint(storage, true)).not.toThrow()
  })

  it('normalizes installation failures into actionable text', () => {
    expect(normalizeInstallError(new Error('status unavailable'))).toBe('status unavailable')
    expect(normalizeInstallError(null)).toContain('重试')
  })
})
