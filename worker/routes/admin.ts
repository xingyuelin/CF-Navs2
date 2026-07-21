import { Hono } from 'hono'
import { ErrCode } from '../../shared/types'
import { getAdminData, getDataVersion } from '../lib/db'
import { shouldBypassRequestCache } from '../lib/requestCache'
import { fail, ok } from '../lib/response'
import { getCachedAdminData, setCachedAdminData } from '../lib/runtimeCache'
import type { HonoEnv } from '../types'

export const adminRoutes = new Hono<HonoEnv>()

adminRoutes.get('/data', async (c) => {
  try {
    const bypassCache = shouldBypassRequestCache(c.req.header('Cache-Control'), c.req.header('Pragma'))
    if (!bypassCache) {
      const cached = getCachedAdminData()
      if (cached) {
        return c.json(ok(cached), 200, {
          'Cache-Control': 'no-store',
        })
      }
    }

    const data = {
      ...await getAdminData(c.env.DB),
      version: await getDataVersion(c.env.DB),
    }
    if (!bypassCache) {
      setCachedAdminData(data)
    }

    return c.json(ok(data), 200, {
      'Cache-Control': 'no-store',
    })
  } catch {
    return c.json(fail(ErrCode.SERVER_ERROR, 'failed to load admin data'))
  }
})

export default adminRoutes
