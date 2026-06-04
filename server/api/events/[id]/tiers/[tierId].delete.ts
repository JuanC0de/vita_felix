import { createError, getRouterParam } from 'h3'
import { requireRole } from '../../../../utils/auth'
import { deleteTier } from '../../../../utils/events-repo'

/**
 * DELETE /api/events/:id/tiers/:tierId
 * Elimina una etapa de boletería. Solo COMPANY_ADMIN o EVENT_MANAGER
 * (req. 2.1, 2.2, 5.4). Tier inexistente o de otra empresa → 404.
 */
export default defineEventHandler(async (event) => {
  await requireRole(event, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER'])
  const id = getRouterParam(event, 'id') as string
  const tierId = getRouterParam(event, 'tierId') as string

  const deleted = await deleteTier(event, id, tierId)
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Etapa de boletería no encontrada' })
  }
  return { ok: true }
})
