import { createError, getRouterParam } from 'h3'
import { requireRole } from '../../../utils/auth'
import { deleteEvent } from '../../../utils/events-repo'

/**
 * DELETE /api/events/:id
 * Elimina un evento y sus etapas de boletería (cascada). Solo COMPANY_ADMIN
 * (EVENT_MANAGER recibe 403) (req. 2.2, 3.5). Inexistente/otra empresa → 404.
 */
export default defineEventHandler(async (event) => {
  await requireRole(event, ['SUPER_ADMIN', 'COMPANY_ADMIN'])
  const id = getRouterParam(event, 'id') as string

  const deleted = await deleteEvent(event, id)
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado' })
  }
  return { ok: true }
})
