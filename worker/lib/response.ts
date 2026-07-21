import type { ApiResponse } from '../../shared/types'
import { ErrCode } from '../../shared/types'

// 成功包络：code=0
export function ok<T>(data: T, msg = 'ok'): ApiResponse<T> {
  return { code: ErrCode.OK, msg, data }
}

// 失败包络：code 为非 0 错误码，data=null
export function fail(code: number, msg: string): ApiResponse<null> {
  return { code, msg, data: null }
}
