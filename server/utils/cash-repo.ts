import type { H3Event } from 'h3'
import { createError } from 'h3'
import { userClient, serviceRoleClient } from './supabase'

/**
 * Representa la estructura de una sesión de caja.
 */
export interface CashSession {
  id: string
  companyId: string
  eventId: string
  userId: string
  openedAt: string
  closedAt: string | null
  openingBalance: number
  closingBalanceExpected: number | null
  closingBalanceReal: number | null
  status: 'open' | 'closed'
}

/**
 * Obtiene la sesión de caja activa para un usuario en un evento específico.
 */
export async function getActiveSession(
  event: H3Event,
  userId: string,
  eventId: string
): Promise<CashSession | null> {
  const db = await userClient(event)
  const { data, error } = await db
    .from('cash_sessions')
    .select('id, company_id, event_id, user_id, opened_at, closed_at, opening_balance, closing_balance_expected, closing_balance_real, status')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .eq('status', 'open')
    .maybeSingle()

  if (error) {
    console.error('Error en getActiveSession:', error)
    throw createError({ 
      statusCode: 500, 
      statusMessage: `Error al consultar la sesión de caja activa: ${error.message} (${error.details || error.code})` 
    })
  }

  if (!data) return null

  return {
    id: data.id,
    companyId: data.company_id,
    eventId: data.event_id,
    userId: data.user_id,
    openedAt: data.opened_at,
    closedAt: data.closed_at,
    openingBalance: Number(data.opening_balance),
    closingBalanceExpected: data.closing_balance_expected ? Number(data.closing_balance_expected) : null,
    closingBalanceReal: data.closing_balance_real ? Number(data.closing_balance_real) : null,
    status: data.status as 'open' | 'closed'
  }
}

/**
 * Abre una nueva sesión de caja registrando el monto de efectivo base inicial.
 */
export async function openSession(
  event: H3Event,
  userId: string,
  eventId: string,
  companyId: string,
  openingBalance: number
): Promise<CashSession> {
  const db = await userClient(event)

  // Validar si ya cuenta con una sesión activa concurrentemente para evitar choques
  const active = await getActiveSession(event, userId, eventId)
  if (active) {
    throw createError({ statusCode: 400, statusMessage: 'El usuario ya tiene una sesión de caja abierta para este evento' })
  }

  const { data, error } = await db
    .from('cash_sessions')
    .insert({
      company_id: companyId,
      event_id: eventId,
      user_id: userId,
      opening_balance: openingBalance,
      status: 'open'
    })
    .select('id, company_id, event_id, user_id, opened_at, closed_at, opening_balance, closing_balance_expected, closing_balance_real, status')
    .single()

  if (error || !data) {
    const errorDetails = error ? `${error.message} (${error.details || error.code})` : 'No se retornaron datos'
    console.error('Error en openSession:', error || 'No data')
    throw createError({ 
      statusCode: 500, 
      statusMessage: `No se pudo abrir la sesión de caja: ${errorDetails}` 
    })
  }

  return {
    id: data.id,
    companyId: data.company_id,
    eventId: data.event_id,
    userId: data.user_id,
    openedAt: data.opened_at,
    closedAt: data.closed_at,
    openingBalance: Number(data.opening_balance),
    closingBalanceExpected: data.closing_balance_expected ? Number(data.closing_balance_expected) : null,
    closingBalanceReal: data.closing_balance_real ? Number(data.closing_balance_real) : null,
    status: data.status as 'open' | 'closed'
  }
}

/**
 * Cierra una sesión de caja realizando el arqueo de efectivo recaudado contra el balance esperado.
 */
export async function closeSession(
  event: H3Event,
  sessionId: string,
  realBalance: number
): Promise<CashSession> {
  const db = await userClient(event)

  // 1) Cargar la sesión actual
  const { data: session, error: sError } = await db
    .from('cash_sessions')
    .select('id, company_id, event_id, opening_balance, status')
    .eq('id', sessionId)
    .maybeSingle()

  if (sError || !session) {
    throw createError({ statusCode: 404, statusMessage: 'La sesión de caja no existe' })
  }

  if (session.status === 'closed') {
    throw createError({ statusCode: 400, statusMessage: 'La sesión de caja ya se encuentra cerrada' })
  }

  // Usamos el cliente de service role para consultar las ventas a fin de evitar filtros RLS restrictivos en la suma
  const serviceDb = await serviceRoleClient(event)

  // 2) Obtener el monto acumulado de ventas presenciales en efectivo
  const { data: sales, error: dsError } = await serviceDb
    .from('door_sales')
    .select('amount')
    .eq('cash_session_id', sessionId)
    .eq('payment_method', 'cash')

  if (dsError) {
    throw createError({ statusCode: 500, statusMessage: 'Error al consultar las transacciones de venta en puerta' })
  }

  const salesCashTotal = (sales || []).reduce((acc, curr) => acc + Number(curr.amount), 0)
  const expectedBalance = Number(session.opening_balance) + salesCashTotal

  // 3) Actualizar la sesión de caja con el estado cerrado y el arqueo
  const { data: closedSession, error: uError } = await db
    .from('cash_sessions')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      closing_balance_expected: expectedBalance,
      closing_balance_real: realBalance
    })
    .eq('id', sessionId)
    .select('id, company_id, event_id, user_id, opened_at, closed_at, opening_balance, closing_balance_expected, closing_balance_real, status')
    .single()

  if (uError || !closedSession) {
    throw createError({ statusCode: 500, statusMessage: 'No se pudo cerrar la sesión de caja' })
  }

  return {
    id: closedSession.id,
    companyId: closedSession.company_id,
    eventId: closedSession.event_id,
    userId: closedSession.user_id,
    openedAt: closedSession.opened_at,
    closedAt: closedSession.closed_at,
    openingBalance: Number(closedSession.opening_balance),
    closingBalanceExpected: Number(closedSession.closing_balance_expected),
    closingBalanceReal: Number(closedSession.closing_balance_real),
    status: closedSession.status as 'open' | 'closed'
  }
}
