import { createError, readBody } from 'h3'
import { requireRole } from '../../utils/auth'
import { closeSession } from '../../utils/cash-repo'

/**
 * POST /api/cash-sessions/close
 * Cierra una sesión de caja procesando el arqueo de caja provisto.
 * Body: { sessionId: string, closingBalanceReal: number }
 */
export default defineEventHandler(async (event) => {
  await requireRole(event, ['GATE_STAFF', 'EVENT_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN', 'LOGISTICS'])

  const body = (await readBody(event)) as {
    sessionId?: unknown
    closingBalanceReal?: unknown
  }

  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''
  const closingBalanceReal = typeof body?.closingBalanceReal === 'number' ? body.closingBalanceReal : NaN

  if (!sessionId || isNaN(closingBalanceReal) || closingBalanceReal < 0) {
    throw createError({ statusCode: 422, statusMessage: 'Parámetros inválidos' })
  }

  return await closeSession(event, sessionId, closingBalanceReal)
})
