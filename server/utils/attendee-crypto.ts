import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto'

/**
 * Protección de la cédula del asistente (req. 2.1, 1.4).
 *
 *   - `encryptCedula`/`decryptCedula`: cifrado autenticado AES-256-GCM. El valor
 *     almacenado nunca queda en texto plano. Formato compacto "iv.tag.ct" en
 *     base64url. El IV aleatorio hace el cifrado NO determinista (seguro), por lo
 *     que no sirve para buscar/deduplicar.
 *   - `hashCedula`: HMAC-SHA256 DETERMINISTA (dominio separado) usado para el
 *     constraint UNIQUE(event_id, cedula_hash) y la detección de duplicados.
 *     No es reversible y no revela la cédula.
 *
 * Módulo puro: la clave se pasa como argumento (Buffer de 32 bytes) → testeable.
 */

const IV_BYTES = 12 // recomendado para GCM

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

export function encryptCedula(plain: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${b64url(iv)}.${b64url(tag)}.${b64url(ct)}`
}

export function decryptCedula(payload: string, key: Buffer): string {
  const parts = payload.split('.')
  if (parts.length !== 3) throw new Error('Formato de cédula cifrada inválido')
  const iv = fromB64url(parts[0] as string)
  const tag = fromB64url(parts[1] as string)
  const ct = fromB64url(parts[2] as string)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}

/**
 * Hash determinista para dedup. Se normaliza la cédula (trim) y se separa el
 * dominio con un prefijo para no reutilizar la misma clave entre HMAC y AES.
 */
export function hashCedula(plain: string, key: Buffer): string {
  return createHmac('sha256', key).update(`cedula:${plain.trim()}`).digest('hex')
}
