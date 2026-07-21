import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Chrome regression cleanup', () => {
  it('separates test-tab cleanup from exact-profile headless process cleanup', () => {
    const source = readFileSync('scripts/chrome-regression.mjs', 'utf8')

    expect(source).toContain("await sendBrowserCommand('Target.closeTarget'")
    expect(source).toContain("await send('Page.close'")
    expect(source).toContain("await send('Browser.close'")
    expect(source).toContain('CF_NAVS_TEST_CHROME_PROFILE')
    expect(source).toContain('Refusing to start temporary Chrome with an unsafe profile path')
    expect(source).toContain('Temporary Chrome cleanup failed')
    expect(source).not.toContain('taskkill /IM chrome.exe')
    expect(source).not.toContain('Stop-Process -Name chrome')
  })

  it('keeps the performance audit scoped to its dedicated test tab', () => {
    const source = readFileSync('scripts/perf-audit.mjs', 'utf8')

    expect(source).toContain('pageTargetCreatedByTest = true')
    expect(source).toContain("await send('Page.close'")
    expect(source).toContain('/json/close/${pageTargetId}')
    expect(source).not.toContain('/json/list')
    expect(source).not.toContain("send('Browser.close'")
    expect(source).not.toContain('Stop-Process')
  })
})
