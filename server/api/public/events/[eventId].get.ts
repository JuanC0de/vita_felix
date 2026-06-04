import { createError, getRouterParam } from 'h3'
import { getPublicEvent } from '../../../utils/tickets-repo'

/**
 * GET /api/public/events/:eventId
 * Datos públicos de un evento PUBLICADO + sus tiers, para el formulario de
 * registro. No requiere sesión. Eventos no publicados/inexistentes → 404
 * (req. 1.3). No expone datos sensibles.
 */
export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, 'eventId') as string
  const data = await getPublicEvent(event, eventId)
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no disponible' })
  }
  return data
})
