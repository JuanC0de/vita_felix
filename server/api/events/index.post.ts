import { createError, readBody } from 'h3'
import { requireRole } from '../../utils/auth'
import { insertEvent } from '../../utils/events-repo'
import { validateEventInput } from '../../utils/events-validation'

/**
 * POST /api/events
 * Crea un evento en estado borrador. Solo COMPANY_ADMIN o EVENT_MANAGER
 * (req. 2.1, 2.2, 3.1). El evento se asocia automáticamente a la empresa del
 * usuario; RLS verifica la coincidencia (req. 1.5). Payload inválido → 422.
 */
export default defineEventHandler(async (event) => {
  const ctx = await requireRole(event, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER'])

  if (!ctx.companyId) {
    throw createError({ statusCode: 422, statusMessage: 'Se requiere un contexto de empresa para crear eventos.' })
  }

  const result = validateEventInput(await readBody(event))
  if (!result.ok) {
    throw createError({ statusCode: 422, statusMessage: 'Datos de evento inválidos', data: { errors: result.errors } })
  }

  return await insertEvent(event, ctx.companyId, result.value)
})
