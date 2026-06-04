import { createError } from 'h3'
import { requireRole } from '../../../utils/auth'
import { serviceRoleClient } from '../../../utils/supabase'

/**
 * POST /api/tickets/[id]/void
 * Anula un ticket emitido (cambia su estado a 'void').
 * Solo accesible para SUPER_ADMIN o COMPANY_ADMIN.
 */
export default defineEventHandler(async (event) => {
  const ctx = await requireRole(event, ['SUPER_ADMIN', 'COMPANY_ADMIN'])
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Falta el identificador de ticket' })
  }

  const db = serviceRoleClient(event)

  // 1) Obtener ticket y validar pertenencia
  const { data: ticket, error: tErr } = await db
    .from('tickets')
    .select('id, company_id')
    .eq('id', id)
    .maybeSingle()

  if (tErr || !ticket) {
    throw createError({ statusCode: 404, statusMessage: 'Ticket no encontrado' })
  }

  if (ctx.role !== 'SUPER_ADMIN' && ctx.companyId !== ticket.company_id) {
    throw createError({ statusCode: 403, statusMessage: 'Acceso denegado' })
  }

  // 2) Anular el ticket
  const { data: updated, error: upErr } = await db
    .from('tickets')
    .update({ status: 'void' })
    .eq('id', id)
    .select()
    .single()

  if (upErr) {
    throw createError({ statusCode: 500, statusMessage: 'No se pudo anular el ticket' })
  }

  return { ok: true, ticket: updated }
})
