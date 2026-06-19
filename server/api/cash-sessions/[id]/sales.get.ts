import { createError } from 'h3'
import { requireRole } from '../../../utils/auth'
import { userClient, serviceRoleClient } from '../../../utils/supabase'

/**
 * GET /api/cash-sessions/[id]/sales
 * Devuelve el desglose detallado de ventas y transacciones de una sesión de caja.
 */
export default defineEventHandler(async (event) => {
  const ctx = await requireRole(event, ['GATE_STAFF', 'EVENT_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN', 'LOGISTICS'])

  const sessionId = event.context.params?.id ?? ''
  if (!sessionId) {
    throw createError({ statusCode: 422, statusMessage: 'Identificador de sesión faltante' })
  }

  // 1) Obtener la sesión para verificar acceso
  const db = await userClient(event)
  const { data: session, error: sError } = await db
    .from('cash_sessions')
    .select('id, user_id, company_id')
    .eq('id', sessionId)
    .maybeSingle()

  if (sError || !session) {
    throw createError({ statusCode: 404, statusMessage: 'Sesión de caja no encontrada' })
  }

  const isAdmin = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER'].includes(ctx.role || '')
  if (!isAdmin && session.user_id !== ctx.userId) {
    throw createError({ statusCode: 403, statusMessage: 'Acceso denegado' })
  }

  // 2) Consultar transacciones de venta asociadas a la sesión
  const serviceDb = await serviceRoleClient(event)
  const { data: sales, error: dsError } = await serviceDb
    .from('door_sales')
    .select(`
      id,
      amount,
      payment_method,
      created_at,
      tickets:ticket_id (
        id,
        ticket_tiers:tier_id (name),
        attendees:attendee_id (full_name)
      )
    `)
    .eq('cash_session_id', sessionId)
    .order('created_at', { ascending: false })

  if (dsError) {
    throw createError({ statusCode: 500, statusMessage: 'Error al consultar las transacciones de venta en puerta' })
  }

  const salesList = (sales || []).map((sale: any) => ({
    id: sale.id,
    amount: Number(sale.amount),
    paymentMethod: sale.payment_method,
    createdAt: sale.created_at,
    tierName: sale.tickets?.ticket_tiers?.name || 'Desconocido',
    attendeeName: sale.tickets?.attendees?.full_name || 'Cliente Puerta'
  }))

  const cashTotal = salesList.filter(s => s.paymentMethod === 'cash').reduce((acc, curr) => acc + curr.amount, 0)
  const cardTotal = salesList.filter(s => s.paymentMethod === 'card').reduce((acc, curr) => acc + curr.amount, 0)
  const transferTotal = salesList.filter(s => s.paymentMethod === 'transfer').reduce((acc, curr) => acc + curr.amount, 0)
  const salesTotal = cashTotal + cardTotal + transferTotal

  return {
    sales: salesList,
    totals: {
      cash: cashTotal,
      card: cardTotal,
      transfer: transferTotal,
      total: salesTotal
    }
  }
})
