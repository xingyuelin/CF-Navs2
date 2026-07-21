import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const files = [
  'src/components/admin/CategoryListPanel.svelte',
  'src/components/admin/BookmarkListPanel.svelte',
]

describe('admin empty-state markup', () => {
  it('does not contain escaped PowerShell newline text', () => {
    for (const file of files) {
      expect(readFileSync(file, 'utf8')).not.toContain('`n')
    }
  })

  it('keeps clear empty-state guidance for a fresh deployment', () => {
    const categoryPanel = readFileSync(files[0], 'utf8')
    const bookmarkPanel = readFileSync(files[1], 'utf8')

    expect(categoryPanel).toContain('暂无分类')
    expect(categoryPanel).toContain('新增分类')
    expect(bookmarkPanel).toContain('暂无书签')
    expect(bookmarkPanel).toContain('请先在分类面板中创建至少一个分类')
  })
})
