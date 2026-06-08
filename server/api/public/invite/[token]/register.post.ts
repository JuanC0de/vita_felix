import { createError, getRequestIP, readBody } from 'h3'
import { registerGuestInvitation } from '../../../../utils/event-hosts-repo'
import { rateLimit } from '../../../../utils/rate-limit'

const RATE_MAX = 5
const RATE_WINDOW_MS = 60_000

/**
 * POST /api/public/invite/:token/register
 * Procesa el registro público de cortesía mediante token y eventId.
 * Controla la concurrencia a nivel de base de datos.
 * Body: { eventId, fullName, email, cedula }
 */
export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const limit = rateLimit(`invite-register:${ip}`, RATE_MAX, RATE_WINDOW_MS)
  if (!limit.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: 'Demasiados intentos de registro. Por favor espera un minuto.',
    })
  }

  const token = event.context.params?.token
  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Token de invitación ausente' })
  }

  const body = await readBody(event)
  if (!body || !body.eventId || !body.fullName || !body.email || !body.cedula) {
    throw createError({ statusCode: 422, statusMessage: 'Datos de registro incompletos o faltantes' })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(body.email)) {
    throw createError({ statusCode: 422, statusMessage: 'El formato de correo electrónico no es válido' })
  }

  if (body.fullName.trim().length === 0) {
    throw createError({ statusCode: 422, statusMessage: 'El nombre completo es requerido' })
  }

  if (body.cedula.trim().length === 0) {
    throw createError({ statusCode: 422, statusMessage: 'La cédula es requerida' })
  }

  return await registerGuestInvitation(event, body.eventId, token, {
    fullName: body.fullName.trim(),
    email: body.email.trim(),
    cedula: body.cedula.trim(),
  })
})
