import { Hono } from 'hono'
import {
  ErrCode,
  type ApiResponse,
  type DataVersionResp,
  type PublicData,
  type Settings,
  type SiteConfig,
} from '../../shared/types'
import { toPublicSettings } from '../../shared/settings'
import {
  cachePrivatePublicDataResponse,
  cachePublicDataResponse,
  cacheSiteConfigResponse,
  matchPublicDataCache,
  matchSiteConfigCache,
} from '../lib/cache'
import { getDataVersion, getPublicDataSource, getSiteConfig } from '../lib/db'
import { shouldBypassRequestCache } from '../lib/requestCache'
import { fail } from '../lib/response'
import { ok } from '../lib/response'
import { extractBearerToken, validateSession } from '../middleware/auth'
import type { HonoEnv } from '../types'

function isSiteConfig(value: unknown): value is SiteConfig {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<SiteConfig>
  return typeof candidate.site_title === 'string' && typeof candidate.public_mode === 'boolean'
}

async function readCachedSiteConfig(requestUrl: string): Promise<SiteConfig | null> {
  const cached = await matchSiteConfigCache(requestUrl)
  if (!cached) return null

  try {
    const payload = await cached.clone().json<ApiResponse<SiteConfig>>()
    return isSiteConfig(payload.data) ? payload.data : null
  } catch {
    return null
  }
}

function cacheSiteConfigData(c: Parameters<typeof cacheSiteConfigResponse>[0], requestUrl: string, data: SiteConfig): void {
  const response = Response.json(ok(data), {
    headers: {
      'Cache-Control': 'public, max-age=15, s-maxage=60, stale-while-revalidate=300',
    },
  })
  cacheSiteConfigResponse(c, requestUrl, response)
}

function unauthorizedResponse() {
  return Response.json(fail(ErrCode.UNAUTHORIZED, 'unauthorized'), {
    status: 401,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

export const publicRoutes = new Hono<HonoEnv>()

publicRoutes.get('/config', async (c) => {
  const bypassCache = shouldBypassRequestCache(c.req.header('Cache-Control'), c.req.header('Pragma'))
  if (!bypassCache) {
    const cached = await matchSiteConfigCache(c.req.url)
    if (cached) return cached
  }

  const data: SiteConfig = await getSiteConfig(c.env.DB)
  const response = c.json(ok(data), 200, {
    'Cache-Control': bypassCache ? 'no-store' : 'public, max-age=15, s-maxage=60, stale-while-revalidate=300',
  })
  if (!bypassCache) {
    cacheSiteConfigResponse(c, c.req.url, response)
  }
  return response
})

publicRoutes.get('/data/version', async (c) => {
  const token = extractBearerToken(c.req.header('Authorization'))
  const siteConfig = await getSiteConfig(c.env.DB)

  if (!siteConfig.public_mode) {
    if (!token) {
      return c.json({
        ...fail(ErrCode.FORBIDDEN, 'forbidden'),
        data: {
          site_title: siteConfig.site_title,
          public_mode: false,
        },
      }, 200, {
        'Cache-Control': 'no-store',
      })
    }

    const session = await validateSession(c.env, token)
    if (!session) {
      return unauthorizedResponse()
    }

    c.set('username', session.username)
  }

  const data: DataVersionResp = {
    version: await getDataVersion(c.env.DB),
    site_title: siteConfig.site_title,
    public_mode: siteConfig.public_mode,
  }

  return c.json(ok(data), 200, {
    'Cache-Control': 'no-store',
  })
})

publicRoutes.get('/public/data', async (c) => {
  const token = extractBearerToken(c.req.header('Authorization'))
  const bypassCache = shouldBypassRequestCache(c.req.header('Cache-Control'), c.req.header('Pragma'))
  let privateAccessAllowed = false
  if (!token && !bypassCache) {
    const cached = await matchPublicDataCache(c.req.url)
    if (cached) return cached
  }

  const cachedSiteConfig = bypassCache ? null : await readCachedSiteConfig(c.req.url)
  const siteConfig = cachedSiteConfig ?? await getSiteConfig(c.env.DB)
  if (!cachedSiteConfig && !bypassCache) {
    cacheSiteConfigData(c, c.req.url, siteConfig)
  }
  if (!siteConfig.public_mode) {
    if (!token) {
      const response = c.json({
        ...fail(ErrCode.FORBIDDEN, 'forbidden'),
        data: {
          site_title: siteConfig.site_title,
          public_mode: false,
        },
      }, 200, {
        'Cache-Control': 'no-store',
      })
      if (!bypassCache) {
        cachePrivatePublicDataResponse(c, c.req.url, response)
      }
      return response
    }

    const session = await validateSession(c.env, token)
    if (!session) {
      return unauthorizedResponse()
    }

    c.set('username', session.username)
    privateAccessAllowed = true
  }

  const publicDataSource = await getPublicDataSource(c.env.DB, cachedSiteConfig ? undefined : siteConfig)
  const publicSettings = publicDataSource.settings
  if (!publicSettings.public_mode && !privateAccessAllowed) {
    if (!token) {
      const response = c.json({
        ...fail(ErrCode.FORBIDDEN, 'forbidden'),
        data: {
          site_title: publicSettings.site_title,
          public_mode: false,
        },
      }, 200, {
        'Cache-Control': 'no-store',
      })
      if (!bypassCache) {
        cachePrivatePublicDataResponse(c, c.req.url, response)
      }
      return response
    }

    const session = await validateSession(c.env, token)
    if (!session) {
      return unauthorizedResponse()
    }

    c.set('username', session.username)
    privateAccessAllowed = true
  }

  const canUsePublicCache = publicSettings.public_mode && !token

  const data: PublicData = {
    categories: publicDataSource.categories,
    bookmarks: publicDataSource.bookmarks,
    settings: toPublicSettings(publicSettings),
    version: await getDataVersion(c.env.DB),
  }

  const response = c.json(ok(data), 200, {
    'Cache-Control': canUsePublicCache && !bypassCache
      ? 'public, max-age=30, s-maxage=120, stale-while-revalidate=300'
      : 'no-store',
  })

  if (canUsePublicCache && !bypassCache) {
    cachePublicDataResponse(c, c.req.url, response)
  }

  return response
})

export default publicRoutes
