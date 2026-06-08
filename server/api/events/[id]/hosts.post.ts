import { createError, readBody } from 'h3'
import { requireRole } from '../../../utils/auth'
import { createHost } from '../../../utils/event-hosts-repo'

/**
 * POST /api/events/:id/hosts
 * Registra un nuevo anfitrión de invitaciones (DJs, socios, relaciones públicas) para el evento.
 * Protegido: Solo COMPANY_ADMIN o EVENT_MANAGER (y SUPER_ADMIN).
 */
export default defineEventHandler(async (event) => {
  await requireRole(event, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER'])

  const eventId = event.context.params?.id
  if (!eventId) {
    throw createError({ statusCode: 400, statusMessage: 'Identificador de evento inválido o ausente' })
  }

  const body = await readBody(event)
  if (!body || !body.name || !body.role || !body.maxGuests) {
    throw createError({ statusCode: 422, statusMessage: 'Datos del anfitrión inválidos o incompletos' })
  }

  const maxGuests = Number(body.maxGuests)
  if (isNaN(maxGuests) || maxGuests <= 0) {
    throw createError({ statusCode: 422, statusMessage: 'El límite de invitados debe ser un número mayor a cero' })
  }

  return await createHost(event, eventId, {
    name: body.name,
    role: body.role,
    maxGuests: maxGuests,
    tierId: body.tierId || null,
  })
})
