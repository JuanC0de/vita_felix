import { createError, getRouterParam, readBody } from 'h3'
import { requireRole } from '../../../utils/auth'
import { updateEvent } from '../../../utils/events-repo'
import { validateEventInput } from '../../../utils/events-validation'

/**
 * PUT /api/events/:id
 * Actualiza un evento. Solo COMPANY_ADMIN o EVENT_MANAGER (req. 2.1, 2.2, 3.4).
 * Payload inválido → 422; evento inexistente o de otra empresa → 404.
 */
export default defineEventHandler(async (event) => {
  await requireRole(event, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER'])
  const id = getRouterParam(event, 'id') as string

  const result = validateEventInput(await readBody(event))
  if (!result.ok) {
    throw createError({ statusCode: 422, statusMessage: 'Datos de evento inválidos', data: { errors: result.errors } })
  }

  const updated = await updateEvent(event, id, result.value)
  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado' })
  }
  return updated
})
