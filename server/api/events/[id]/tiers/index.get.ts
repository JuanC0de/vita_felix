import { createError, getRouterParam } from 'h3'
import { requireUser } from '../../../../utils/auth'
import { getEvent, listTiers } from '../../../../utils/events-repo'

/**
 * GET /api/events/:id/tiers
 * Lista las etapas de boletería de un evento de la empresa del usuario.
 * Evento inexistente o de otra empresa → 404 (req. 5.5).
 */
export default defineEventHandler(async (event) => {
  await requireUser(event)
  const id = getRouterParam(event, 'id') as string
  const parent = await getEvent(event, id)
  if (!parent) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado' })
  }
  return await listTiers(event, id)
})
