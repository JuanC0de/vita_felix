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

  // 2) Obtener etapas de boletería (tiers) y calcular capacidad.
  //    La etapa de cortesía (kind='courtesy') no es aforo en venta: se reporta
  //    aparte para que el aforo de preventa no se vea consumido por invitaciones.
  const { data: tiers, error: tiersErr } = await db
    .from('ticket_tiers')
    .select('id, name, price, currency, quota, kind')
    .eq('event_id', id)

  const ticketTiers = tiers ?? []
  const saleTiers = ticketTiers.filter((t: any) => t.kind !== 'courtesy')

  // Capacidad total = suma de quotas de las etapas de venta
  const capacityTotal = saleTiers.reduce((acc, t) => acc + (t.quota || 0), 0)
  const courtesyCapacity = ticketTiers
    .filter((t: any) => t.kind === 'courtesy')
    .reduce((acc, t) => acc + (t.quota || 0), 0)

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

  const { count: courtesiesIssuedRaw } = await db
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', id)
    .eq('is_courtesy', true)
    .neq('status', 'void')

  const issuedCount = ticketsIssued || 0
  const usedCount = ticketsUsed || 0
  const courtesiesIssued = courtesiesIssuedRaw || 0
  // Boletas realmente vendidas: lo emitido menos las invitaciones gratuitas
  const soldCount = Math.max(0, issuedCount - courtesiesIssued)
  const availableCount = Math.max(0, capacityTotal - soldCount)

  // Ingresos estimados del evento (las cortesías no son ventas)
  const { data: ticketSales } = await db
    .from('tickets')
    .select('ticket_tiers(price)')
    .eq('event_id', id)
    .eq('is_courtesy', false)
    .neq('status', 'void')

  const estimatedRevenue = (ticketSales ?? []).reduce((acc: number, t: any) => {
    const price = t.ticket_tiers?.price ? Number(t.ticket_tiers.price) : 0
    return acc + price
  }, 0)

  // Porcentaje de ingreso en puerta
  const doorEntryPct = issuedCount > 0 
    ? Math.round((usedCount / issuedCount) * 100) 
    : 0

  // 3.1) Obtener ingresos de taquilla física desglosados por método de pago
  const { data: doorSalesData } = await db
    .from('door_sales')
    .select('amount, payment_method')
    .eq('event_id', id)

  const doorSales = doorSalesData || []
  const doorRevenueCash = doorSales
    .filter((s: any) => s.payment_method === 'cash')
    .reduce((acc: number, s: any) => acc + Number(s.amount), 0)
  const doorRevenueCard = doorSales
    .filter((s: any) => s.payment_method === 'card')
    .reduce((acc: number, s: any) => acc + Number(s.amount), 0)
  const doorRevenueTotal = doorRevenueCash + doorRevenueCard

  // 4) Ventas por etapa (tiers)
  const salesByTier = await Promise.all(
    ticketTiers.map(async (t: any) => {
      const { count: issued } = await db
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('tier_id', t.id)
        .neq('status', 'void')

      // Una etapa de venta puede tener cortesías encima (anfitrión con etapa
      // explícita): ocupan cupo pero no generan ingreso.
      const { count: courtesies } = await db
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('tier_id', t.id)
        .eq('is_courtesy', true)
        .neq('status', 'void')

      const issuedCountTier = issued || 0
      const courtesyCountTier = courtesies || 0
      const soldCountTier = Math.max(0, issuedCountTier - courtesyCountTier)

      return {
        id: t.id,
        name: t.name,
        kind: t.kind ?? 'sale',
        isCourtesy: t.kind === 'courtesy',
        price: Number(t.price),
        currency: t.currency.trim(),
        quota: t.quota,
        issued: issuedCountTier,
        sold: soldCountTier,
        courtesies: courtesyCountTier,
        available: Math.max(0, t.quota - issuedCountTier),
        revenue: soldCountTier * Number(t.price),
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
      courtesyCapacity,
      ticketsIssued: issuedCount,
      ticketsSold: soldCount,
      courtesiesIssued,
      ticketsAvailable: availableCount,
      ticketsUsed: usedCount,
      estimatedRevenue,
      doorEntryPct,
      doorRevenueCash,
      doorRevenueCard,
      doorRevenueTotal
    },
    salesByTier,
  }
})

