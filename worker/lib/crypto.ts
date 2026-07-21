// PBKDF2 密码哈希 / 校验（WebCrypto）。存储形式：`saltHex:hashHex`

const ITERATIONS = 100_000
const KEY_LEN_BITS = 256
const SALT_LEN = 16

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (const b of bytes) s += b.toString(16).padStart(2, '0')
  return s
}

function fromHex(hex: string): Uint8Array {
  const len = hex.length / 2
  const out = new Uint8Array(len)
  for (let i = 0; i < len; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16)
  return out
}

async function derive(password: string, salt: Uint8Array): Promise<string> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LEN_BITS,
  )
  return toHex(bits)
}

// 返回 `saltHex:hashHex`
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN))
  const hash = await derive(password, salt)
  return `${toHex(salt)}:${hash}`
}

// 常量时间比较，避免时序泄露
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function secretsEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const [aHash, bHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ])
  return timingSafeEqual(toHex(aHash), toHex(bHash))
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const idx = stored.indexOf(':')
  if (idx < 0) return false
  const saltHex = stored.slice(0, idx)
  const hashHex = stored.slice(idx + 1)
  if (!saltHex || !hashHex) return false
  const salt = fromHex(saltHex)
  const computed = await derive(password, salt)
  return timingSafeEqual(computed, hashHex)
}

// 生成随机 token（hex）
export function generateToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)))
}
