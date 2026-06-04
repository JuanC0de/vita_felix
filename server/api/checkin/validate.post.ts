import { createError, readBody } from 'h3'
import { requireRole } from '../../utils/auth'
import { verifyToken } from '../../utils/qr-token'
import { checkinTicket } from '../../utils/tickets-repo'
import { getTicketingSecrets } from '../../utils/ticketing-config'
import type { CheckinResult } from '../../../app/types/ticketing'

/**
 * POST /api/checkin/validate
 * Valida el token del QR y ejecuta el check-in atómico (req. 5,6,7,8).
 * Solo GATE_STAFF (o SUPER_ADMIN). Verifica firma + expiración server-side y,
 * si el token es auténtico, delega el check-in atómico a la DB (RLS escopa por
 * empresa). Devuelve 200 con un resultado distinguible para que el escáner lo
 * muestre; un token inválido NO marca ningún check-in.
 * Body: { token: string }.
 */
export default defineEventHandler(async (event): Promise<CheckinResult> => {
  await requireRole(event, ['GATE_STAFF', 'SUPER_ADMIN'])

  const body = (await readBody(event)) as { token?: unknown }
  const token = typeof body?.token === 'string' ? body.token : ''
  if (!token) {
    throw createError({ statusCode: 422, statusMessage: 'Falta el token del QR' })
  }

  const { qrSecret } = getTicketingSecrets()
  const verified = verifyToken(token, qrSecret)
  if (!verified.ok) {
    // Firma/expiración/formato inválidos → rechazo sin tocar la DB (req. 3.4).
    return { status: 'invalid', reason: verified.reason }
  }

  return await checkinTicket(event, verified.payload.sub)
})
