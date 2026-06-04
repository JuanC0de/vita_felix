import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Token del código QR: un JWT compacto firmado con HMAC-SHA256 (HS256).
 *
 * Diseño (req. 3.x):
 *   - El payload referencia el ticket por id opaco (`sub`); NUNCA contiene la
 *     cédula ni datos personales (req. 2.2).
 *   - La firma HMAC hace que cualquier alteración del payload invalide el token
 *     (req. 3.2).
 *   - `exp` da expiración; un token vencido se rechaza en la verificación
 *     (req. 3.3). La revocación real es por estado del ticket en DB.
 *   - Módulo puro: el secreto se pasa como argumento → testeable sin entorno.
 */

export interface QrPayload {
  sub: string
  iat: number
  exp: number
}

const HEADER = { alg: 'HS256', typ: 'JWT' } as const

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function base64urlJson(value: unknown): string {
  return base64url(JSON.stringify(value))
}

function sign(data: string, secret: string): string {
  return base64url(createHmac('sha256', secret).update(data).digest())
}

/**
 * Firma un token para `sub` (ticketId) con expiración `exp` (epoch en segundos).
 * `iat` se fija a `now` (epoch en segundos), inyectable para pruebas.
 */
export function signToken(
  payload: { sub: string; exp: number },
  secret: string,
  now: number = Math.floor(Date.now() / 1000),
): string {
  const fullPayload: QrPayload = { sub: payload.sub, iat: now, exp: payload.exp }
  const head = base64urlJson(HEADER)
  const body = base64urlJson(fullPayload)
  const signingInput = `${head}.${body}`
  return `${signingInput}.${sign(signingInput, secret)}`
}

export type VerifyResult =
  | { ok: true; payload: QrPayload }
  | { ok: false; reason: 'malformed' | 'signature' | 'expired' }

/** Compara firmas en tiempo constante para evitar fugas por timing. */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

/**
 * Verifica firma y expiración. NO consulta la DB: la revocación por estado del
 * ticket es responsabilidad del check-in (req. 3.4, 6.4).
 */
export function verifyToken(
  token: string,
  secret: string,
  now: number = Math.floor(Date.now() / 1000),
): VerifyResult {
  if (typeof token !== 'string') return { ok: false, reason: 'malformed' }
  const parts = token.split('.')
  if (parts.length !== 3) return { ok: false, reason: 'malformed' }
  const head = parts[0] as string
  const body = parts[1] as string
  const signature = parts[2] as string

  const expected = sign(`${head}.${body}`, secret)
  if (!safeEqual(signature, expected)) return { ok: false, reason: 'signature' }

  let payload: QrPayload
  try {
    const json = Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    payload = JSON.parse(json) as QrPayload
  } catch {
    return { ok: false, reason: 'malformed' }
  }

  if (
    typeof payload?.sub !== 'string' ||
    typeof payload?.exp !== 'number' ||
    typeof payload?.iat !== 'number'
  ) {
    return { ok: false, reason: 'malformed' }
  }

  if (now >= payload.exp) return { ok: false, reason: 'expired' }

  return { ok: true, payload }
}
