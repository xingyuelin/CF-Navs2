import { describe, expect, it } from 'vitest'
import type { AdminBookmarkSummary, AdminCategorySummary } from '../../src/lib/appData'
import {
  clampAdminListPage,
  createAdminListPage,
  createAdminSortDraft,
  filterAdminBookmarks,
  filterAdminCategories,
  getAdminCategoryBookmarkCount,
  getAdminCategoryTitle,
  getAdminListTotalPages,
  getAdminSortIds,
  reorderAdminSortDraft,
} from '../../src/lib/adminListState'

const categories: AdminCategorySummary[] = [
  { id: 1, title: 'Tools', icon: 'tool', bookmarkCount: 8 },
  { id: 'docs', title: 'Documentation', icon: 'book' },
]

const bookmarks: AdminBookmarkSummary[] = [
  {
    id: 10,
    category_id: 1,
    title: 'GitHub',
    url: 'https://github.com',
    description: 'Code hosting',
  },
  {
    id: 11,
    category_id: 'docs',
    title: 'Svelte',
    url: 'https://svelte.dev/docs',
    description: 'Framework docs',
  },
  {
    id: 12,
    category_id: 'missing',
    title: 'Worker API',
    url: 'https://developers.cloudflare.com/workers',
    description: '',
  },
]

describe('admin list state helpers', () => {
  it('filters bookmarks by title, URL, and category title', () => {
    expect(filterAdminBookmarks(bookmarks, categories, ' github ')).toEqual([bookmarks[0]])
    expect(filterAdminBookmarks(bookmarks, categories, 'SVELTE.DEV')).toEqual([bookmarks[1]])
    expect(filterAdminBookmarks(bookmarks, categories, 'documentation')).toEqual([bookmarks[1]])
    expect(filterAdminBookmarks(bookmarks, categories, 'absent')).toEqual([])
  })

  it('keeps blank bookmark search as the original list', () => {
    expect(filterAdminBookmarks(bookmarks, categories, '   ')).toBe(bookmarks)
  })

  it('filters categories by title and keeps blank search as the original list', () => {
    expect(filterAdminCategories(categories, ' doc ')).toEqual([categories[1]])
    expect(filterAdminCategories(categories, '   ')).toBe(categories)
  })

  it('derives category titles and count fallback values', () => {
    expect(getAdminCategoryTitle(categories, 1)).toBe('Tools')
    expect(getAdminCategoryTitle(categories, 'missing')).toBe('未分类')
    expect(getAdminCategoryTitle(categories, 'missing', 'Unknown')).toBe('Unknown')

    expect(getAdminCategoryBookmarkCount(categories[0], bookmarks)).toBe(8)
    expect(getAdminCategoryBookmarkCount(categories[1], bookmarks)).toBe(1)
  })

  it('creates a clamped page view with display range metadata', () => {
    const items = Array.from({ length: 21 }, (_, index) => index + 1)

    expect(getAdminListTotalPages(items.length, 10)).toBe(3)
    expect(clampAdminListPage(99, 3)).toBe(3)
    expect(clampAdminListPage(-5, 3)).toBe(1)

    expect(createAdminListPage(items, 3, 10)).toEqual({
      page: 3,
      totalPages: 3,
      items: [21],
      start: 21,
      end: 21,
      total: 21,
    })

    expect(createAdminListPage(items, 99, 10).page).toBe(3)
    expect(createAdminListPage([], 2, 10)).toMatchObject({
      page: 1,
      totalPages: 1,
      items: [],
      start: 0,
      end: 0,
      total: 0,
    })
  })

  it('creates sortable drafts, reorders by ids, and exposes save ids', () => {
    const draft = createAdminSortDraft(bookmarks)

    expect(draft).toEqual(bookmarks)
    expect(draft).not.toBe(bookmarks)
    expect(reorderAdminSortDraft(draft, [12, '10', 'unknown']).map((bookmark) => bookmark.id)).toEqual([12, 10])
    expect(getAdminSortIds(draft)).toEqual([10, 11, 12])
  })
})
