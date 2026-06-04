import { createError, getRouterParam, readBody } from 'h3'
import { requireRole } from '../../../../utils/auth'
import { createTier, getEvent } from '../../../../utils/events-repo'
import { validateTierInput } from '../../../../utils/events-validation'

/**
 * POST /api/events/:id/tiers
 * Crea una etapa de boletería en un evento. Solo COMPANY_ADMIN o EVENT_MANAGER
 * (req. 2.1, 2.2, 5.1). Payload inválido → 422; evento no accesible → 404.
 * El tier hereda la empresa del evento vía trigger (req. 1.6).
 */
export default defineEventHandler(async (event) => {
  await requireRole(event, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER'])
  const id = getRouterParam(event, 'id') as string

  const parent = await getEvent(event, id)
  if (!parent) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado' })
  }

  const result = validateTierInput(await readBody(event))
  if (!result.ok) {
    throw createError({ statusCode: 422, statusMessage: 'Datos de boletería inválidos', data: { errors: result.errors } })
  }

  return await createTier(event, id, result.value)
})
