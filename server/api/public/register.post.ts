import { createError, getRequestIP, readBody } from 'h3'
import { registerAndIssue } from '../../utils/tickets-repo'
import { validateRegistrationInput } from '../../utils/ticketing-validation'
import { rateLimit } from '../../utils/rate-limit'

const RATE_MAX = 5
const RATE_WINDOW_MS = 60_000

/**
 * POST /api/public/register
 * Registro público (sin sesión) que crea asistente + ticket y emite el PDF
 * (req. 1.1, 1.2, 1.4, 1.5, 1.6, 2, 3, 4). Rate limiting básico por IP.
 * Body: { eventId, tierId, fullName, cedula, email }.
 */
export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const limit = rateLimit(`register:${ip}`, RATE_MAX, RATE_WINDOW_MS)
  if (!limit.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
    })
  }

  const body = (await readBody(event)) as { eventId?: unknown }
  const eventId = typeof body?.eventId === 'string' ? body.eventId : ''
  if (!eventId) {
    throw createError({ statusCode: 422, statusMessage: 'Falta el evento' })
  }

  const result = validateRegistrationInput(body)
  if (!result.ok) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Datos de registro inválidos',
      data: { errors: result.errors },
    })
  }

  return await registerAndIssue(event, eventId, result.value)
})
