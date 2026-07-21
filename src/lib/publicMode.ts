import { ErrCode, type SiteConfig } from '../../shared/types'
import { isApiError } from './api'

export function isPublicModeForbidden(error: unknown): boolean {
  return isApiError(error) && error.code === ErrCode.FORBIDDEN
}

export function siteConfigFromForbiddenError(error: unknown): SiteConfig | null {
  if (!isApiError(error) || !error.data || typeof error.data !== 'object') {
    return null
  }

  const data = error.data as Partial<SiteConfig>
  if (typeof data.site_title === 'string' && data.public_mode === false) {
    return {
      site_title: data.site_title,
      public_mode: false,
    }
  }

  return null
}
