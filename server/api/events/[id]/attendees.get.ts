import { createError } from 'h3'
import { requireRole } from '../../../utils/auth'
import { serviceRoleClient } from '../../../utils/supabase'
import { decryptCedula } from '../../../utils/attendee-crypto'
import { getTicketingSecrets } from '../../../utils/ticketing-config'

/**
 * GET /api/events/[id]/attendees
 * Retorna los asistentes registrados de un evento con su documento descifrado.
 * Solo accesible para SUPER_ADMIN, COMPANY_ADMIN o EVENT_MANAGER de la empresa.
 */
export default defineEventHandler(async (event) => {
  const ctx = await requireRole(event, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER'])
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Falta el identificador de evento' })
  }

  const db = serviceRoleClient(event)

  // 1) Obtener detalles del evento para validar pertenencia
  const { data: ev, error: evErr } = await db
    .from('events')
    .select('company_id')
    .eq('id', id)
    .maybeSingle()

  if (evErr || !ev) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado' })
  }

  // Validar pertenencia
  if (ctx.role !== 'SUPER_ADMIN' && ctx.companyId !== ev.company_id) {
    throw createError({ statusCode: 403, statusMessage: 'Acceso denegado' })
  }

  // 2) Obtener asistentes
  const { data: attendees, error: attErr } = await db
    .from('attendees')
    .select('id, full_name, email, cedula_enc, created_at')
    .eq('event_id', id)
    .order('created_at', { ascending: false })

  if (attErr || !attendees) return []

  const { encKey } = getTicketingSecrets()

  // 3) Enriquecer con datos del ticket
  const enriched = await Promise.all(
    attendees.map(async (att) => {
      // Consulta base de ticket (campos que siempre existen)
      const { data: ticket, error: ticketErr } = await (db as any)
        .from('tickets')
        .select('id, status, used_at, ticket_tiers(name)')
        .eq('attendee_id', att.id)
        .maybeSingle()

      // Si la consulta base falla, se registra pero no se rompe la lista
      if (ticketErr) {
        console.error(`[attendees] Error al obtener ticket de attendee ${att.id}:`, ticketErr.message)
      }

      // Intentar obtener transfer_receipt_path de forma independiente
      let transferReceiptPath: string | null = null
      if (ticket?.id) {
        const { data: receiptData } = await (db as any)
          .from('tickets')
          .select('transfer_receipt_path')
          .eq('id', ticket.id)
          .maybeSingle()
        transferReceiptPath = receiptData?.transfer_receipt_path || null
      }

      let cedula = ''
      try {
        cedula = decryptCedula(att.cedula_enc, encKey)
      } catch {
        cedula = 'Error al descifrar'
      }

      return {
        id: att.id,
        fullName: att.full_name,
        email: att.email,
        cedula,
        createdAt: att.created_at,
        ticket: ticket ? {
          id: ticket.id,
          status: ticket.status,
          usedAt: ticket.used_at,
          tierName: ticket.ticket_tiers?.name || 'Desconocido',
          transferReceiptPath,
        } : null
      }
    })
  )

  return enriched
})
