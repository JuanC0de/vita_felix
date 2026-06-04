import { createError, getRouterParam, readBody } from 'h3'
import { requireRole } from '../../../../utils/auth'
import { updateTier } from '../../../../utils/events-repo'
import { validateTierInput } from '../../../../utils/events-validation'

/**
 * PUT /api/events/:id/tiers/:tierId
 * Actualiza una etapa de boletería. Solo COMPANY_ADMIN o EVENT_MANAGER
 * (req. 2.1, 2.2, 5.4). Payload inválido → 422; tier inexistente o de otra
 * empresa → 404.
 */
export default defineEventHandler(async (event) => {
  await requireRole(event, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER'])
  const id = getRouterParam(event, 'id') as string
  const tierId = getRouterParam(event, 'tierId') as string

  const result = validateTierInput(await readBody(event))
  if (!result.ok) {
    throw createError({ statusCode: 422, statusMessage: 'Datos de boletería inválidos', data: { errors: result.errors } })
  }

  const updated = await updateTier(event, id, tierId, result.value)
  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Etapa de boletería no encontrada' })
  }
  return updated
})
