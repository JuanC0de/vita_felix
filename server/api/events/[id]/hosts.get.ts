import { createError } from 'h3'
import { requireRole } from '../../../utils/auth'
import { listHosts } from '../../../utils/event-hosts-repo'

/**
 * GET /api/events/:id/hosts
 * Obtiene el listado de todos los anfitriones registrados para el evento, junto con sus estadísticas.
 * Protegido: Solo COMPANY_ADMIN o EVENT_MANAGER (y SUPER_ADMIN).
 */
export default defineEventHandler(async (event) => {
  await requireRole(event, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER'])

  const eventId = event.context.params?.id
  if (!eventId) {
    throw createError({ statusCode: 400, statusMessage: 'Identificador de evento inválido o ausente' })
  }

  return await listHosts(event, eventId)
})
