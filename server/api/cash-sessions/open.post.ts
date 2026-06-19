import { createError, readBody } from 'h3'
import { requireRole } from '../../utils/auth'
import { openSession } from '../../utils/cash-repo'

/**
 * POST /api/cash-sessions/open
 * Abre una nueva sesión de caja registrando el balance base de efectivo inicial.
 * Body: { eventId: string, companyId: string, openingBalance: number }
 */
export default defineEventHandler(async (event) => {
  const ctx = await requireRole(event, ['GATE_STAFF', 'EVENT_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN', 'LOGISTICS'])

  const body = (await readBody(event)) as {
    eventId?: unknown
    companyId?: unknown
    openingBalance?: unknown
  }

  const eventId = typeof body?.eventId === 'string' ? body.eventId : ''
  const companyId = typeof body?.companyId === 'string' ? body.companyId : ''
  const openingBalance = typeof body?.openingBalance === 'number' ? body.openingBalance : NaN

  if (!eventId || !companyId || isNaN(openingBalance) || openingBalance < 0) {
    throw createError({ statusCode: 422, statusMessage: 'Parámetros inválidos' })
  }

  // Validar aislamiento multi-tenant a menos que sea SUPER_ADMIN
  if (ctx.role !== 'SUPER_ADMIN' && companyId !== ctx.companyId) {
    throw createError({ statusCode: 403, statusMessage: 'Acceso denegado' })
  }

  return await openSession(event, ctx.userId, eventId, companyId, openingBalance)
})
