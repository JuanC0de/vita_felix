import { createError, getQuery } from 'h3'
import { requireRole } from '../../utils/auth'
import { userClient } from '../../utils/supabase'

/**
 * GET /api/cash-sessions
 * Obtiene la lista de todas las sesiones de caja del evento.
 * Reservado para roles de administración del evento.
 * Query: ?eventId=uuid
 */
export default defineEventHandler(async (event) => {
  const ctx = await requireRole(event, ['GATE_STAFF', 'EVENT_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN', 'LOGISTICS'])

  const query = getQuery(event) as { eventId?: string }
  const eventId = query.eventId ? query.eventId.trim() : ''

  if (!eventId) {
    throw createError({ statusCode: 422, statusMessage: 'Falta el identificador del evento' })
  }

  const db = await userClient(event)
  let req = db
    .from('cash_sessions')
    .select(`
      id,
      company_id,
      event_id,
      user_id,
      opened_at,
      closed_at,
      opening_balance,
      closing_balance_expected,
      closing_balance_real,
      status
    `)
    .eq('event_id', eventId)

  const isAdmin = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER'].includes(ctx.role || '')
  if (!isAdmin) {
    req = req.eq('user_id', ctx.userId)
  }

  const { data, error } = await req.order('opened_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Error al consultar las sesiones de caja' })
  }

  const sessionsRaw = data || []
  const profilesMap: Record<string, string> = {}

  if (sessionsRaw.length > 0) {
    const userIds = Array.from(new Set(sessionsRaw.map((s: any) => s.user_id)))
    const { data: profiles, error: pError } = await db
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)

    if (!pError && profiles) {
      profiles.forEach((p: any) => {
        profilesMap[p.id] = p.full_name || 'Desconocido'
      })
    }
  }

  // Calcular saldo esperado acumulado dinámicamente para sesiones activas (abiertas)
  const activeSessionIds = sessionsRaw.filter((s: any) => s.status === 'open').map((s: any) => s.id)
  const activeExpectedMap: Record<string, number> = {}

  if (activeSessionIds.length > 0) {
    const serviceDb = await serviceRoleClient(event)
    const { data: sales, error: sErr } = await serviceDb
      .from('door_sales')
      .select('cash_session_id, amount')
      .in('cash_session_id', activeSessionIds)
      .eq('payment_method', 'cash')

    if (!sErr && sales) {
      sales.forEach((sale: any) => {
        const sid = sale.cash_session_id
        activeExpectedMap[sid] = (activeExpectedMap[sid] || 0) + Number(sale.amount)
      })
    }
  }

  const sessions = sessionsRaw.map((s: any) => {
    const isSessionOpen = s.status === 'open'
    const dynamicExpected = isSessionOpen 
      ? Number(s.opening_balance) + (activeExpectedMap[s.id] || 0)
      : (s.closing_balance_expected ? Number(s.closing_balance_expected) : null)

    return {
      id: s.id,
      companyId: s.company_id,
      eventId: s.event_id,
      userId: s.user_id,
      userFullName: profilesMap[s.user_id] || 'Desconocido',
      openedAt: s.opened_at,
      closedAt: s.closed_at,
      openingBalance: Number(s.opening_balance),
      closingBalanceExpected: dynamicExpected,
      closingBalanceReal: s.closing_balance_real ? Number(s.closing_balance_real) : null,
      status: s.status as 'open' | 'closed'
    }
  })

  return { sessions }
})
