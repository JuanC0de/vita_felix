import { createError, getQuery } from 'h3'
import { getInvitationStatus } from '../../../../utils/event-hosts-repo'

/**
 * GET /api/public/invite/:token/status
 * Consulta de manera pública la validez y los cupos disponibles de un token de invitación.
 * QueryParams: ?eventId=...
 */
export default defineEventHandler(async (event) => {
  const token = event.context.params?.token
  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Token de invitación ausente' })
  }

  const query = getQuery(event)
  const eventId = typeof query.eventId === 'string' ? query.eventId : ''
  if (!eventId) {
    throw createError({ statusCode: 422, statusMessage: 'Identificador de evento ausente' })
  }

  const status = await getInvitationStatus(event, eventId, token)
  if (!status.valid) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Enlace de invitación no válido o expirado',
    })
  }

  return status
})
