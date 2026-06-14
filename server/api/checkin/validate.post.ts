import { createError, readBody } from 'h3'
import { requireRole } from '../../utils/auth'
import { verifyToken } from '../../utils/qr-token'
import { checkinTicket } from '../../utils/tickets-repo'
import { getTicketingSecrets } from '../../utils/ticketing-config'
import { hashCedula } from '../../utils/attendee-crypto'
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

  const body = (await readBody(event)) as { token?: unknown; eventId?: unknown }
  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  const eventId = typeof body?.eventId === 'string' ? body.eventId : ''

  if (!token) {
    throw createError({ statusCode: 422, statusMessage: 'Falta el token o documento de validación' })
  }

  const db = serviceRoleClient(event)
  const { qrSecret, encKey } = getTicketingSecrets()

  // 1) Caso de uso: Entrada manual con código corto legible (ej: VF-70A2FBB)
  if (token.toUpperCase().startsWith('VF-')) {
    const cleanCode = token.substring(3).toLowerCase().trim()
    
    // Evitar búsquedas de prefijos muy cortos por seguridad ante colisiones
    if (cleanCode.length < 5) {
      return { status: 'invalid', reason: 'not_found' }
    }

    const { data: ticket, error: searchErr } = await db
      .from('tickets')
      .select('id')
      .ilike('id', `${cleanCode}%`)
      .maybeSingle()

    if (searchErr || !ticket) {
      return { status: 'invalid', reason: 'not_found' }
    }

    return await checkinTicket(event, ticket.id)
  }

  // 2) Caso de uso: Escaneo de código QR (token JWT firmado)
  // Los JWT constan de tres partes separadas por puntos (header.payload.signature)
  if (token.includes('.')) {
    const verified = verifyToken(token, qrSecret)
    if (!verified.ok) {
      // Firma/expiración/formato inválidos → rechazo sin tocar la DB (req. 3.4).
      return { status: 'invalid', reason: verified.reason }
    }

    return await checkinTicket(event, verified.payload.sub)
  }

  // 3) Caso de uso: Búsqueda manual por documento de identidad (cédula)
  // Requiere obligatoriamente filtrar por evento para evitar colisiones
  if (eventId) {
    const cedulaHash = hashCedula(token, encKey)

    // Buscar asistente en base al hash de su cédula y al evento seleccionado
    const { data: attendee, error: aErr } = await db
      .from('attendees')
      .select('id')
      .eq('event_id', eventId)
      .eq('cedula_hash', cedulaHash)
      .maybeSingle()

    if (aErr || !attendee) {
      return { status: 'invalid', reason: 'not_found' }
    }

    // Obtener el ticket asociado a dicho asistente
    const { data: ticket, error: tErr } = await db
      .from('tickets')
      .select('id')
      .eq('attendee_id', attendee.id)
      .maybeSingle()

    if (tErr || !ticket) {
      return { status: 'invalid', reason: 'not_found' }
    }

    return await checkinTicket(event, ticket.id)
  }

  return { status: 'invalid', reason: 'not_found' }
})
