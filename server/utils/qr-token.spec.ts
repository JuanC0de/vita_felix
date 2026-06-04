import { describe, expect, it } from 'vitest'
import { signToken, verifyToken } from './qr-token'

const SECRET = 'test-secret-of-sufficient-length-1234'

describe('qr-token: firma y verificación', () => {
  it('un token recién firmado verifica y conserva el sub', () => {
    const now = 1_000_000
    const token = signToken({ sub: 'ticket-123', exp: now + 3600 }, SECRET, now)
    const res = verifyToken(token, SECRET, now)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.payload.sub).toBe('ticket-123')
      expect(res.payload.exp).toBe(now + 3600)
    }
  })

  it('detecta un payload alterado (firma inválida)', () => {
    const now = 1_000_000
    const token = signToken({ sub: 'ticket-123', exp: now + 3600 }, SECRET, now)
    const [head, , sig] = token.split('.')
    const forgedBody = Buffer.from(JSON.stringify({ sub: 'otro', iat: now, exp: now + 3600 }))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    const forged = `${head}.${forgedBody}.${sig}`
    const res = verifyToken(forged, SECRET, now)
    expect(res).toEqual({ ok: false, reason: 'signature' })
  })

  it('rechaza un token firmado con otro secreto', () => {
    const now = 1_000_000
    const token = signToken({ sub: 'ticket-123', exp: now + 3600 }, SECRET, now)
    const res = verifyToken(token, 'otro-secreto-distinto-1234567890', now)
    expect(res).toEqual({ ok: false, reason: 'signature' })
  })

  it('rechaza un token expirado', () => {
    const iat = 1_000_000
    const token = signToken({ sub: 'ticket-123', exp: iat + 100 }, SECRET, iat)
    const res = verifyToken(token, SECRET, iat + 200)
    expect(res).toEqual({ ok: false, reason: 'expired' })
  })

  it('rechaza un token malformado', () => {
    expect(verifyToken('no-es-un-token', SECRET)).toEqual({ ok: false, reason: 'malformed' })
    expect(verifyToken('a.b', SECRET)).toEqual({ ok: false, reason: 'malformed' })
  })
})
