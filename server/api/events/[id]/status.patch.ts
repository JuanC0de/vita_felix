import { createError, getRouterParam, readBody } from 'h3'
import { requireRole } from '../../../utils/auth'
import { getEvent, listTiers, setEventStatus } from '../../../utils/events-repo'
import { nextStatus } from '../../../utils/event-status'
import { STATUS_ACTIONS, type StatusAction } from '../../../../app/types/events'

/**
 * PATCH /api/events/:id/status
 * Aplica una transición de estado (publish/finish/cancel) validada server-side.
 * Solo COMPANY_ADMIN o EVENT_MANAGER. Transición no permitida → 409; publicar sin
 * etapas de boletería → 409 (req. 4.2, 4.3, 4.4, 4.5).
 */
export default defineEventHandler(async (event) => {
  await requireRole(event, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER'])
  const id = getRouterParam(event, 'id') as string

  const body = (await readBody(event)) as { action?: unknown }
  const action = body?.action
  if (typeof action !== 'string' || !(STATUS_ACTIONS as readonly string[]).includes(action)) {
    throw createError({ statusCode: 422, statusMessage: 'Acción de estado inválida' })
  }

  const current = await getEvent(event, id)
  if (!current) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado' })
  }

  const target = nextStatus(current.status, action as StatusAction)
  if (!target) {
    // El mensaje legible viaja en `message` (statusMessage se sanea y pierde acentos).
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      message: `No se puede ${action} un evento en estado ${current.status}.`,
    })
  }

  // Publicar exige al menos una etapa de boletería (req. 4.3).
  if (target === 'published') {
    const tiers = current.tiers.length > 0 ? current.tiers : await listTiers(event, id)
    if (tiers.length === 0) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Conflict',
        message: 'Se requiere al menos una etapa de boletería para publicar el evento.',
      })
    }
  }

  const updated = await setEventStatus(event, id, target)
  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado' })
  }
  return updated
})
