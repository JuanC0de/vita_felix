import { createError } from 'h3'
import { requireRole } from '../../../utils/auth'
import { serviceRoleClient } from '../../../utils/supabase'

/**
 * GET /api/events/[id]/dashboard
 * Retorna las métricas analíticas operativas de un evento específico.
 * Solo accesible para SUPER_ADMIN, COMPANY_ADMIN o EVENT_MANAGER de la empresa.
 */
export default defineEventHandler(async (event) => {
  const ctx = await requireRole(event, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER'])
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Falta el identificador de evento' })
  }

  const db = serviceRoleClient(event)

  // 1) Obtener detalles del evento
  const { data: ev, error: evErr } = await db
    .from('events')
    .select('id, name, venue, event_at, status, company_id')
    .eq('id', id)
    .maybeSingle()

  if (evErr || !ev) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado' })
  }

  // Si es COMPANY_ADMIN o EVENT_MANAGER, validar que sea de su propia empresa
  if (ctx.role !== 'SUPER_ADMIN' && ctx.companyId !== ev.company_id) {
    throw createError({ statusCode: 403, statusMessage: 'Acceso denegado' })
  }

  // 2) Obtener etapas de boletería (tiers) y calcular capacidad
  const { data: tiers, error: tiersErr } = await db
    .from('ticket_tiers')
    .select('id, name, price, currency, quota')
    .eq('event_id', id)

  const ticketTiers = tiers ?? []

  // Capacidad total = suma de quotas de tiers
  const capacityTotal = ticketTiers.reduce((acc, t) => acc + (t.quota || 0), 0)

  // 3) Obtener conteos de tickets
  const { count: ticketsIssued } = await db
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', id)
    .neq('status', 'void')

  const { count: ticketsUsed } = await db
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', id)
    .eq('status', 'used')

  const issuedCount = ticketsIssued || 0
  const usedCount = ticketsUsed || 0
  const availableCount = Math.max(0, capacityTotal - issuedCount)

  // Ingresos estimados del evento
  const { data: ticketSales } = await db
    .from('tickets')
    .select('ticket_tiers(price)')
    .eq('event_id', id)
    .neq('status', 'void')

  const estimatedRevenue = (ticketSales ?? []).reduce((acc: number, t: any) => {
    const price = t.ticket_tiers?.price ? Number(t.ticket_tiers.price) : 0
    return acc + price
  }, 0)

  // Porcentaje de ingreso en puerta
  const doorEntryPct = issuedCount > 0 
    ? Math.round((usedCount / issuedCount) * 100) 
    : 0

  // 4) Ventas por etapa (tiers)
  const salesByTier = await Promise.all(
    ticketTiers.map(async (t) => {
      const { count: sold } = await db
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('tier_id', t.id)
        .neq('status', 'void')
      
      const soldCount = sold || 0
      return {
        id: t.id,
        name: t.name,
        price: Number(t.price),
        currency: t.currency.trim(),
        quota: t.quota,
        sold: soldCount,
        available: Math.max(0, t.quota - soldCount),
        revenue: soldCount * Number(t.price),
      }
    })
  )

  return {
    event: {
      id: ev.id,
      name: ev.name,
      venue: ev.venue,
      date: ev.event_at,
      status: ev.status,
    },
    metrics: {
      capacityTotal,
      ticketsIssued: issuedCount,
      ticketsAvailable: availableCount,
      ticketsUsed: usedCount,
      estimatedRevenue,
      doorEntryPct,
    },
    salesByTier,
  }
})
