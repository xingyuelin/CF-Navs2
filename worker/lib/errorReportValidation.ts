export const MAX_ERROR_REPORT_BODY_BYTES = 16 * 1024
export const MAX_ERROR_REPORT_ENTRIES = 10
export const MAX_ERROR_MESSAGE_LENGTH = 200
export const MAX_ERROR_URL_LENGTH = 200
export const MAX_ERROR_CATEGORY_LENGTH = 32

export type NormalizedErrorReportEntry = {
  category: string
  message: string
  timestamp: number
  url?: string
  line?: number
  col?: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function boundedInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined
}

export function normalizeErrorReportEntry(value: unknown, now = Date.now()): NormalizedErrorReportEntry | null {
  if (!isRecord(value) || typeof value.message !== 'string') return null
  const message = value.message.trim().slice(0, MAX_ERROR_MESSAGE_LENGTH)
  if (!message) return null
  const category = typeof value.category === 'string' && value.category.trim()
    ? value.category.trim().slice(0, MAX_ERROR_CATEGORY_LENGTH).toLowerCase()
    : 'unknown'
  const timestamp = typeof value.timestamp === 'number' && Number.isFinite(value.timestamp) && Math.abs(value.timestamp) <= 8.64e15
    ? value.timestamp
    : now
  const url = typeof value.url === 'string' && value.url.trim()
    ? value.url.trim().slice(0, MAX_ERROR_URL_LENGTH)
    : undefined
  const line = boundedInteger(value.line)
  const col = boundedInteger(value.col)
  return { category, message, timestamp, ...(url ? { url } : {}), ...(line !== undefined ? { line } : {}), ...(col !== undefined ? { col } : {}) }
}

export function normalizeErrorReportPayload(value: unknown): NormalizedErrorReportEntry[] {
  const source = isRecord(value) && Array.isArray(value.errors) ? value.errors : [value]
  return source.slice(0, MAX_ERROR_REPORT_ENTRIES)
    .map((entry) => normalizeErrorReportEntry(entry))
    .filter((entry): entry is NormalizedErrorReportEntry => entry !== null)
}

export function exceedsErrorReportBodyLimit(contentLength: string | undefined, body: string): boolean {
  const declaredLength = Number(contentLength ?? '0')
  return (Number.isFinite(declaredLength) && declaredLength > MAX_ERROR_REPORT_BODY_BYTES) || new TextEncoder().encode(body).byteLength > MAX_ERROR_REPORT_BODY_BYTES
}
