import { createError, getQuery } from 'h3'
import { requireRole } from '../../../utils/auth'
import { serviceRoleClient } from '../../../utils/supabase'

/**
 * GET /api/admin/payments/transactions
 * Retorna las transacciones de pago online.
 * - SUPER_ADMIN puede ver todas las transacciones de la plataforma.
 * - COMPANY_ADMIN y EVENT_MANAGER pueden ver solo las transacciones de su empresa.
 */
export default defineEventHandler(async (event) => {
  const ctx = await requireRole(event, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER'])
  const query = getQuery(event)

  const limit = Math.min(Number(query.limit) || 20, 100)
  const offset = Math.max(Number(query.offset) || 0, 0)
  const eventId = typeof query.eventId === 'string' ? query.eventId : ''
  const status = typeof query.status === 'string' ? query.status : ''
  const search = typeof query.search === 'string' ? query.search.trim() : ''

  const db = serviceRoleClient(event)

  let q = db
    .from('payment_transactions')
    .select(`
      *,
      events (name),
      companies (name)
    `, { count: 'exact' })

  // 1) Aplicar RLS por rol en el código (como respaldo de RLS)
  if (ctx.role !== 'SUPER_ADMIN' && ctx.companyId) {
    q = q.eq('company_id', ctx.companyId)
  }

  // 2) Aplicar filtros
  if (eventId) {
    q = q.eq('event_id', eventId)
  }
  if (status) {
    q = q.eq('status', status as any)
  }
  if (search) {
    // Buscar por coincidencia parcial en referencia o serialización de JSONB
    q = q.or(`reference.ilike.%${search}%,attendees_data::text.ilike.%${search}%`)
  }

  // 3) Paginación y ordenamiento
  const { data, count, error } = await q
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Error al consultar transacciones de pago.' })
  }

  // Mapear los resultados enriqueciendo las claves
  const transactions = (data || []).map((tx: any) => ({
    id: tx.id,
    eventId: tx.event_id,
    eventName: tx.events?.name ?? 'Evento Desconocido',
    companyId: tx.company_id,
    companyName: tx.companies?.name ?? 'Empresa Desconocida',
    reference: tx.reference,
    wompiId: tx.wompi_id,
    amountInCents: tx.amount_in_cents,
    currency: tx.currency,
    status: tx.status,
    attendeesData: tx.attendees_data,
    auditedBy: tx.audited_by,
    auditedAt: tx.audited_at,
    auditNote: tx.audit_note,
    createdAt: tx.created_at,
    updatedAt: tx.updated_at,
  }))

  return {
    transactions,
    total: count || 0,
    limit,
    offset,
  }
})
