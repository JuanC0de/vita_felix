import { createError } from 'h3'
import { useRuntimeConfig } from '#imports'

/**
 * Acceso a los secretos server-only de ticketing (req. 2.1, 3.x, 8.4).
 * Falla de forma explícita si faltan o son inválidos, en vez de emitir tokens
 * débiles. Estos valores NUNCA se exponen al cliente (viven en runtimeConfig
 * privado, no en `public`).
 */
export interface TicketingSecrets {
  qrSecret: string
  encKey: Buffer
  graceHours: number
}

let cached: TicketingSecrets | null = null

export function getTicketingSecrets(): TicketingSecrets {
  if (cached) return cached

  const config = useRuntimeConfig()
  const qrSecret = String(config.qrJwtSecret ?? '')
  const encRaw = String(config.attendeeEncKey ?? '')
  const graceHours = Number(config.qrGraceHours ?? 12)

  if (qrSecret.length < 16) {
    throw createError({ statusCode: 500, statusMessage: 'QR_JWT_SECRET no está configurado' })
  }

  const encKey = Buffer.from(encRaw, 'base64')
  if (encKey.length !== 32) {
    throw createError({
      statusCode: 500,
      statusMessage: 'ATTENDEE_ENC_KEY debe ser de 32 bytes (base64)',
    })
  }

  cached = {
    qrSecret,
    encKey,
    graceHours: Number.isFinite(graceHours) && graceHours >= 0 ? graceHours : 12,
  }
  return cached
}
