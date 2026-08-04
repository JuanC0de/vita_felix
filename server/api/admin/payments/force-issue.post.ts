import { createError, readBody } from 'h3'
import { requireRole } from '../../../utils/auth'
import { serviceRoleClient } from '../../../utils/supabase'
import { issueTicketsForTransaction } from '../../../utils/tickets-repo'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default defineEventHandler(async (event) => {
  const ctx = await requireRole(event, ['SUPER_ADMIN', 'COMPANY_ADMIN'])
  const body = (await readBody(event)) as {
    transactionId?: unknown
    auditNote?: unknown
  }

  const transactionId = typeof body?.transactionId === 'string' ? body.transactionId.trim() : ''
  const auditNote = typeof body?.auditNote === 'string' ? body.auditNote.trim() : ''

  if (!transactionId || !UUID_RE.test(transactionId)) {
    throw createError({ statusCode: 400, statusMessage: 'Identificador de transacción inválido.' })
  }
  if (!auditNote) {
    throw createError({ statusCode: 400, statusMessage: 'La nota de auditoría es obligatoria.' })
  }

  const db = serviceRoleClient(event)

  // 1) Obtener la transacción para validar RLS del Company Admin
  const { data: tx, error: txError } = await db
    .from('payment_transactions')
    .select('id, company_id, status')
    .eq('id', transactionId)
    .maybeSingle()

  if (txError || !tx) {
    throw createError({ statusCode: 404, statusMessage: 'Transacción de pago no encontrada.' })
  }

  // Si es administrador de empresa, validar que le pertenezca la transacción
  if (ctx.role === 'COMPANY_ADMIN' && ctx.companyId !== tx.company_id) {
    throw createError({ statusCode: 403, statusMessage: 'Acceso denegado. Esta transacción pertenece a otra empresa.' })
  }

  // 2) Comprobar si ya fue aprobada
  if (tx.status === 'approved') {
    throw createError({ statusCode: 409, statusMessage: 'La transacción ya se encuentra aprobada y emitida.' })
  }

  try {
    // 3) Ejecutar emisión forzada manual
    const emittedTickets = await issueTicketsForTransaction(event, transactionId, {
      auditedBy: ctx.userId,
      auditNote,
    })

    return {
      success: true,
      emittedTickets,
    }
  } catch (err: any) {
    console.error('Error al forzar emisión manual:', err)
    throw createError({
      statusCode: 500,
      statusMessage: `No se pudo forzar la emisión manual de boletas: ${err.message || 'Error interno'}`,
    })
  }
})
