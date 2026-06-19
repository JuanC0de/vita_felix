import { createError, getQuery } from 'h3'
import { requireRole } from '../../utils/auth'
import { getActiveSession } from '../../utils/cash-repo'

/**
 * GET /api/cash-sessions/active
 * Obtiene la sesión de caja abierta y activa del usuario para un evento.
 * Query: ?eventId=uuid
 */
export default defineEventHandler(async (event) => {
  const ctx = await requireRole(event, ['GATE_STAFF', 'EVENT_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN', 'LOGISTICS'])

  const query = getQuery(event) as { eventId?: string }
  const eventId = query.eventId ? query.eventId.trim() : ''

  if (!eventId) {
    throw createError({ statusCode: 422, statusMessage: 'Falta el identificador del evento' })
  }

  const session = await getActiveSession(event, ctx.userId, eventId)
  return { session }
})
