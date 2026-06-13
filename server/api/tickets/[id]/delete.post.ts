import { createError, getRouterParam } from 'h3'
import { requireRole } from '../../../utils/auth'
import { serviceRoleClient } from '../../../utils/supabase'

/**
 * POST /api/tickets/[id]/delete
 * Elimina permanentemente un ticket de ingreso y los datos de su asistente.
 * Remueve los archivos asociados en Supabase Storage (PDF del ticket y comprobante de pago).
 * Solo accesible para SUPER_ADMIN o COMPANY_ADMIN.
 */
export default defineEventHandler(async (event) => {
  const ctx = await requireRole(event, ['SUPER_ADMIN', 'COMPANY_ADMIN'])
  const id = getRouterParam(event, 'id') as string

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Falta el identificador de ticket' })
  }

  const db = serviceRoleClient(event)

  // 1) Obtener datos del ticket
  const { data: ticket, error: tErr } = await db
    .from('tickets')
    .select('id, company_id, pdf_path, transfer_receipt_path, attendee_id')
    .eq('id', id)
    .maybeSingle()

  if (tErr || !ticket) {
    throw createError({ statusCode: 404, statusMessage: 'Ticket no encontrado' })
  }

  // 2) Validar pertenencia del ticket a la empresa del usuario si no es SUPER_ADMIN
  if (ctx.role !== 'SUPER_ADMIN' && ctx.companyId !== ticket.company_id) {
    throw createError({ statusCode: 403, statusMessage: 'Acceso denegado' })
  }

  // 3) Eliminar archivos asociados del almacenamiento de Supabase (Storage)
  const filesToRemove: string[] = []
  if (ticket.pdf_path) {
    filesToRemove.push(ticket.pdf_path)
  }
  if (ticket.transfer_receipt_path) {
    filesToRemove.push(ticket.transfer_receipt_path)
  }

  if (filesToRemove.length > 0) {
    const { error: storageErr } = await db.storage
      .from('tickets')
      .remove(filesToRemove)

    if (storageErr) {
      console.error('Error al intentar eliminar archivos de almacenamiento en Supabase Storage:', storageErr)
    }
  }

  // 4) Eliminar el registro del asistente en la base de datos.
  // La FK 'attendee_id' en tickets tiene la regla 'on delete cascade',
  // por lo que al borrar el asistente se eliminará el ticket de forma atómica.
  const { error: delErr } = await db
    .from('attendees')
    .delete()
    .eq('id', ticket.attendee_id)

  if (delErr) {
    throw createError({ statusCode: 500, statusMessage: 'No se pudo eliminar el asistente y su ticket de la base de datos' })
  }

  return { ok: true }
})
