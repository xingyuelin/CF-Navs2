import { Hono } from 'hono'
import type { Context } from 'hono'
import {
  ErrCode,
  type HideVerifyReq,
  type HideVerifyResp,
  type PublicBookmark,
  type PublicCategory,
} from '../../shared/types'
import { HIDDEN_BOOKMARK_LIST_SQL, HIDDEN_CATEGORY_LIST_SQL } from '../lib/db/sql'
import { getSettings } from '../lib/db'
import { fail, ok } from '../lib/response'
import type { HonoEnv } from '../types'

type AppContext = Context<HonoEnv>

async function readJson<T>(c: AppContext): Promise<T | null> {
  try {
    return await c.req.json<T>()
  } catch {
    return null
  }
}

export const hideRoutes = new Hono<HonoEnv>()

hideRoutes.post('/hide/verify', async (c) => {
  const body = await readJson<HideVerifyReq>(c)
  if (!body || typeof body.password !== 'string' || body.password.trim().length === 0) {
    return c.json(fail(ErrCode.BAD_REQUEST, 'invalid password'))
  }

  try {
    const settings = await getSettings(c.env.DB)
    const storedPassword = settings.hide_password ?? ''

    if (!storedPassword || storedPassword.trim() === '') {
      return c.json(fail(ErrCode.BAD_REQUEST, 'hide password not configured'))
    }

    if (body.password !== storedPassword) {
      const result: HideVerifyResp = {
        valid: false,
        categories: [],
        bookmarks: [],
      }
      return c.json(ok(result))
    }

    const [categoriesResult, bookmarksResult] = await c.env.DB.batch([
      c.env.DB.prepare(HIDDEN_CATEGORY_LIST_SQL),
      c.env.DB.prepare(HIDDEN_BOOKMARK_LIST_SQL),
    ])

    const result: HideVerifyResp = {
      valid: true,
      categories: (categoriesResult.results ?? []) as PublicCategory[],
      bookmarks: (bookmarksResult.results ?? []) as PublicBookmark[],
    }

    return c.json(ok(result))
  } catch {
    return c.json(fail(ErrCode.SERVER_ERROR, 'failed to verify hide password'))
  }
})

export default hideRoutes
