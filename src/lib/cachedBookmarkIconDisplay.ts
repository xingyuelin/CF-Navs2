import { isDataImage } from './localBookmarkIconCache'

export type CachedBookmarkIconDisplayInput = {
  syncLocalUrl: string
  localUrl: string
  failed: boolean
  iconBlob: string
  shouldWaitForLocalCache: boolean
  cachePending: boolean
  src: string
}

export function resolveCachedBookmarkIconDisplaySrc(input: CachedBookmarkIconDisplayInput): string {
  if (input.syncLocalUrl) return input.syncLocalUrl
  if (input.localUrl) return input.localUrl
  if (input.failed) return ''
  if (isDataImage(input.iconBlob)) return input.iconBlob
  if (input.shouldWaitForLocalCache && input.cachePending) return ''
  return input.src
}
