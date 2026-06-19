import { createError, readBody } from 'h3'
import { requireRole } from '../../../utils/auth'
import { getActiveSession } from '../../../utils/cash-repo'
import { sellTicketAtDoor } from '../../../utils/tickets-repo'

/**
 * POST /api/events/[id]/door-sales
 * Endpoint atómico para procesar la venta de boletería en puerta y marcar check-in de inmediato.
 * Body: { tierId: string, paymentMethod: 'cash' | 'card' }
 */
export default defineEventHandler(async (event) => {
  const ctx = await requireRole(event, ['GATE_STAFF', 'EVENT_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN', 'LOGISTICS'])

  const eventId = event.context.params?.id ?? ''
  if (!eventId) {
    throw createError({ statusCode: 422, statusMessage: 'Identificador del evento faltante' })
  }

  const body = (await readBody(event)) as {
    tierId?: unknown
    paymentMethod?: unknown
  }

  const tierId = typeof body?.tierId === 'string' ? body.tierId : ''
  const paymentMethod = typeof body?.paymentMethod === 'string' ? body.paymentMethod : ''

  if (!tierId || (paymentMethod !== 'cash' && paymentMethod !== 'card' && paymentMethod !== 'transfer')) {
    throw createError({ statusCode: 422, statusMessage: 'Parámetros de venta inválidos' })
  }

  // 1) Validar si el operario tiene una sesión de caja abierta y activa para este evento
  const activeSession = await getActiveSession(event, ctx.userId, eventId)
  if (!activeSession) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No cuentas con una sesión de caja abierta para registrar ventas en este evento. Por favor abre tu caja primero.'
    })
  }

  // 2) Ejecutar la transacción de venta rápida en puerta
  const result = await sellTicketAtDoor(
    event,
    eventId,
    tierId,
    activeSession.id,
    paymentMethod as 'cash' | 'card' | 'transfer',
    ctx.userId
  )

  return {
    success: true,
    ...result
  }
})
