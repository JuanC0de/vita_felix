import { createError, getRouterParam } from 'h3'
import { requireUser } from '../../../utils/auth'
import { getEvent } from '../../../utils/events-repo'

/**
 * GET /api/events/:id
 * Devuelve el evento (con sus etapas de boletería). RLS limita a la empresa del
 * usuario; un evento de otra empresa devuelve 404 (req. 1.2, 3.6).
 */
export default defineEventHandler(async (event) => {
  await requireUser(event)
  const id = getRouterParam(event, 'id') as string
  const found = await getEvent(event, id)
  if (!found) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado' })
  }
  return found
})
