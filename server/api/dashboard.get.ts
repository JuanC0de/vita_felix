import { requireUser } from '../utils/auth'
import { serviceRoleClient } from '../utils/supabase'

/**
 * GET /api/dashboard
 * Retorna las métricas y visualizaciones del Dashboard según el rol del usuario.
 * - SUPER_ADMIN: Métricas consolidadas del SaaS, empresas, eventos y alertas operativas.
 * - COMPANY_ADMIN: Métricas específicas de su empresa, ventas e ingresos estimados.
 */
export default defineEventHandler(async (event) => {
  const ctx = await requireUser(event)
  const db = serviceRoleClient(event)

  if (ctx.role === 'SUPER_ADMIN') {
    // ─────────────────────────────────────────────────────────────────────────
    // DASHBOARD GLOBAL (SUPER_ADMIN)
    // ─────────────────────────────────────────────────────────────────────────
    
    // 1) Métricas clave
    const { count: activeCompanies } = await db
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    const { count: suspendedCompanies } = await db
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'suspended')

    const { count: publishedEvents } = await db
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')

    const { count: totalTickets } = await db
      .from('tickets')
      .select('*', { count: 'exact', head: true })

    const { count: validatedTickets } = await db
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'used')

    // Ingresos estimados totales (suma de precios de tickets vendidos)
    // Hacemos un join entre tickets y ticket_tiers
    const { data: ticketSales } = await db
      .from('tickets')
      .select('ticket_tiers(price)')

    const estimatedRevenue = (ticketSales ?? []).reduce((acc: number, t: any) => {
      const price = t.ticket_tiers?.price ? Number(t.ticket_tiers.price) : 0
      return acc + price
    }, 0)

    // Ocupación promedio (porcentaje de tickets usados vs emitidos)
    const averageOccupancy = totalTickets && totalTickets > 0 
      ? Math.round(((validatedTickets || 0) / totalTickets) * 100) 
      : 0

    // 2) Actividad reciente
    const { data: recentEvents } = await db
      .from('events')
      .select('id, name, created_at, companies(name)')
      .order('created_at', { ascending: false })
      .limit(5)

    const { data: recentCheckins } = await db
      .from('checkins')
      .select('id, result, created_at, tickets(attendee_id, attendees(full_name))')
      .order('created_at', { ascending: false })
      .limit(5)

    const recentActivity = [
      ...(recentEvents ?? []).map((ev: any) => ({
        type: 'event',
        label: `Nuevo evento "${ev.name}"`,
        subtext: `Organizado por ${ev.companies?.name || 'Desconocida'}`,
        time: ev.created_at,
      })),
      ...(recentCheckins ?? []).map((ch: any) => ({
        type: 'checkin',
        label: `Intento de acceso: ${ch.result === 'admitted' ? 'Admitido' : 'Rechazado (' + ch.result + ')'}`,
        subtext: `Asistente: ${ch.tickets?.attendees?.full_name || 'Desconocido'}`,
        time: ch.created_at,
      })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 6)

    // 3) Alertas operativas
    const alerts: Array<{ type: 'warning' | 'danger'; text: string }> = []

    // Alerta: Empresas suspendidas con eventos activos
    if (suspendedCompanies && suspendedCompanies > 0) {
      const { data: susp } = await db.from('companies').select('id').eq('status', 'suspended')
      const suspIds = (susp ?? []).map(s => s.id)
      if (suspIds.length > 0) {
        const { count: actEvs } = await db
          .from('events')
          .select('*', { count: 'exact', head: true })
          .in('company_id', suspIds)
          .eq('status', 'published')
        
        if (actEvs && actEvs > 0) {
          alerts.push({
            type: 'danger',
            text: `Hay ${actEvs} evento(s) publicado(s) pertenecientes a empresas suspendidas.`,
          })
        }
      }
    }

    // Alerta: Eventos publicados sin etapas de boletería
    const { data: pubEvs } = await db.from('events').select('id, name').eq('status', 'published')
    for (const ev of (pubEvs ?? [])) {
      const { count: tierCount } = await db
        .from('ticket_tiers')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', ev.id)
      if (!tierCount || tierCount === 0) {
        alerts.push({
          type: 'warning',
          text: `El evento "${ev.name}" está publicado pero no tiene etapas de boletería configuradas.`,
        })
      }
    }

    return {
      type: 'global',
      kpis: {
        activeCompanies: activeCompanies || 0,
        publishedEvents: publishedEvents || 0,
        issuedTickets: totalTickets || 0,
        validatedTickets: validatedTickets || 0,
        estimatedRevenue,
        averageOccupancy,
      },
      recentActivity,
      alerts,
    }
  } else {
    // ─────────────────────────────────────────────────────────────────────────
    // DASHBOARD DE EMPRESA (COMPANY_ADMIN, EVENT_MANAGER, etc.)
    // ─────────────────────────────────────────────────────────────────────────
    const companyId = ctx.companyId

    if (!companyId) {
      return { type: 'company', kpis: {}, error: 'No tienes una empresa activa' }
    }

    // 1) Métricas clave de la empresa
    const { count: activeEvents } = await db
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'published')

    const { count: totalTickets } = await db
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)

    const { count: validatedTickets } = await db
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'used')

    // Ingresos estimados de la empresa
    const { data: ticketSales } = await db
      .from('tickets')
      .select('ticket_tiers(price)')
      .eq('company_id', companyId)

    const estimatedRevenue = (ticketSales ?? []).reduce((acc: number, t: any) => {
      const price = t.ticket_tiers?.price ? Number(t.ticket_tiers.price) : 0
      return acc + price
    }, 0)

    const averageOccupancy = totalTickets && totalTickets > 0 
      ? Math.round(((validatedTickets || 0) / totalTickets) * 100) 
      : 0

    // Próximo evento de la empresa
    const { data: nextEventRow } = await db
      .from('events')
      .select('id, name, event_at, venue')
      .eq('company_id', companyId)
      .eq('status', 'published')
      .gte('event_at', new Date().toISOString())
      .order('event_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    return {
      type: 'company',
      kpis: {
        activeEvents: activeEvents || 0,
        issuedTickets: totalTickets || 0,
        validatedTickets: validatedTickets || 0,
        estimatedRevenue,
        averageOccupancy,
        nextEvent: nextEventRow ? {
          name: nextEventRow.name,
          date: nextEventRow.event_at,
          venue: nextEventRow.venue,
        } : null,
      }
    }
  }
})
