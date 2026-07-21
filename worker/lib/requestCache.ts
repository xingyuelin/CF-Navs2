export function shouldBypassRequestCache(cacheControl: string | undefined, pragma: string | undefined): boolean {
  return (
    /\b(no-cache|no-store|max-age=0)\b/i.test(cacheControl ?? '') ||
    /\bno-cache\b/i.test(pragma ?? '')
  )
}
