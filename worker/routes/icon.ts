import { Hono } from 'hono'
import { ErrCode } from '../../shared/types'
import { getBookmarkIconData, getCategory, setIconBlob } from '../lib/db'
import {
  dataUriToResponse,
  fetchCacheableIcon,
  iconBytesToDataUri,
  iconBytesToResponse,
  isIconifyIconUrl,
} from '../lib/iconData'
import { iconifyUrlFromParams, normalizeIconifySearchQuery, searchIconifyIcons } from '../lib/iconifySearch'
import {
  cachedFallbackIconResponse,
  cacheResponse,
  errorIconResponse,
  fallbackIconResponse,
  getCachedIconResponse,
  ICON_SUCCESS_CACHE,
} from '../lib/iconResponses'
import { fail, ok } from '../lib/response'
import type { HonoEnv } from '../types'

export const iconRoutes = new Hono<HonoEnv>()

iconRoutes.get('/iconify-search', async (c) => {
  const query = normalizeIconifySearchQuery(c.req.query('query') ?? '')
  if (!query) {
    return c.json(fail(ErrCode.BAD_REQUEST, 'invalid iconify query'), 400)
  }

  const data = await searchIconifyIcons(query, c.req.url, (request, response) => {
    cacheResponse(c, request, response)
  })
  if (!data) {
    return c.json(fail(ErrCode.SERVER_ERROR, 'failed to search iconify icons'), 502)
  }

  const response = c.json(ok(data))
  response.headers.set('Cache-Control', 'private, max-age=300')
  return response
})

iconRoutes.get('/iconify/:prefix/:name', async (c) => {
  const iconUrl = iconifyUrlFromParams(c.req.param('prefix'), c.req.param('name'))
  if (!iconUrl) {
    return errorIconResponse('invalid iconify icon', 400)
  }

  try {
    const cached = await getCachedIconResponse(c.req.raw)
    if (cached) {
      return cached
    }

    const icon = await fetchCacheableIcon(iconUrl)
    if (!icon) {
      return cachedFallbackIconResponse(c, c.req.raw, c.req.param('name').replace(/\.svg$/i, ''), iconUrl)
    }

    const response = iconBytesToResponse(icon, ICON_SUCCESS_CACHE)
    cacheResponse(c, c.req.raw, response)
    return response
  } catch {
    return fallbackIconResponse(c.req.param('name').replace(/\.svg$/i, ''), iconUrl)
  }
})

iconRoutes.get('/icon/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) {
    return errorIconResponse('invalid id', 400)
  }

  try {
    const cached = await getCachedIconResponse(c.req.raw)
    if (cached) {
      return cached
    }

    const bookmark = await getBookmarkIconData(c.env.DB, id)
    if (bookmark?.icon_blob) {
      const response = dataUriToResponse(bookmark.icon_blob, ICON_SUCCESS_CACHE)
      if (!response) {
        await setIconBlob(c.env.DB, id, null)
      } else {
        cacheResponse(c, c.req.raw, response)
        return response
      }
    }

    if (!bookmark?.icon) {
      return cachedFallbackIconResponse(c, c.req.raw, bookmark?.title ?? '', bookmark?.url ?? '')
    }

    if (bookmark.icon.startsWith('data:image/')) {
      await setIconBlob(c.env.DB, id, bookmark.icon)
      const response = dataUriToResponse(bookmark.icon, ICON_SUCCESS_CACHE)
      if (!response) return cachedFallbackIconResponse(c, c.req.raw, bookmark.title, bookmark.url)
      cacheResponse(c, c.req.raw, response)
      return response
    }

    if (!/^https?:\/\//i.test(bookmark.icon)) {
      return cachedFallbackIconResponse(c, c.req.raw, bookmark.title, bookmark.url)
    }

    const fetchedIcon = await fetchCacheableIcon(bookmark.icon)
    if (!fetchedIcon) {
      return cachedFallbackIconResponse(c, c.req.raw, bookmark.title, bookmark.url)
    }

    if (isIconifyIconUrl(bookmark.icon)) {
      const response = iconBytesToResponse(fetchedIcon, ICON_SUCCESS_CACHE)
      cacheResponse(c, c.req.raw, response)
      return response
    }

    await setIconBlob(c.env.DB, id, iconBytesToDataUri(fetchedIcon))
    const response = iconBytesToResponse(fetchedIcon, ICON_SUCCESS_CACHE)
    cacheResponse(c, c.req.raw, response)
    return response
  } catch {
    return fallbackIconResponse('', '')
  }
})

iconRoutes.get('/category-icon/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) {
    return errorIconResponse('invalid id', 400)
  }

  try {
    const cached = await getCachedIconResponse(c.req.raw)
    if (cached) {
      return cached
    }

    const category = await getCategory(c.env.DB, id)
    if (!category?.icon) {
      return cachedFallbackIconResponse(c, c.req.raw, category?.title ?? '', '')
    }

    if (category.icon.startsWith('data:image/')) {
      const response = dataUriToResponse(category.icon, ICON_SUCCESS_CACHE)
      if (!response) return cachedFallbackIconResponse(c, c.req.raw, category.title, '')
      cacheResponse(c, c.req.raw, response)
      return response
    }

    if (!/^https?:\/\//i.test(category.icon)) {
      return cachedFallbackIconResponse(c, c.req.raw, category.title, '')
    }

    const fetchedIcon = await fetchCacheableIcon(category.icon)
    if (!fetchedIcon) {
      return cachedFallbackIconResponse(c, c.req.raw, category.title, category.icon)
    }

    const response = iconBytesToResponse(fetchedIcon, ICON_SUCCESS_CACHE)
    cacheResponse(c, c.req.raw, response)
    return response
  } catch {
    return fallbackIconResponse('', '')
  }
})
