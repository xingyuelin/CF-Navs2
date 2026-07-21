export const DEFAULT_PAGE_SIZE = 10

export function pageCount(total: number, pageSize = DEFAULT_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize))
}

export function clampPage(page: number, totalPages: number): number {
  if (!Number.isFinite(page)) return 1
  return Math.min(Math.max(1, Math.trunc(page)), totalPages)
}

export function slicePage<T>(items: T[], page: number, pageSize = DEFAULT_PAGE_SIZE): T[] {
  const start = (clampPage(page, pageCount(items.length, pageSize)) - 1) * pageSize
  return items.slice(start, start + pageSize)
}

export function pageStart(page: number, total: number, pageSize = DEFAULT_PAGE_SIZE): number {
  if (total === 0) return 0
  return (clampPage(page, pageCount(total, pageSize)) - 1) * pageSize + 1
}

export function pageEnd(page: number, total: number, pageSize = DEFAULT_PAGE_SIZE): number {
  if (total === 0) return 0
  return Math.min(clampPage(page, pageCount(total, pageSize)) * pageSize, total)
}
