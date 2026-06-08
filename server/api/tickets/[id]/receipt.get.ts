import { createError, getRouterParam, sendRedirect } from 'h3'
import { getTicketReceiptUrl } from '../../../utils/tickets-repo'

/**
 * GET /api/tickets/:id/receipt
 * Redirige a una URL firmada fresca del comprobante de transferencia del ticket.
 * Acceso vía URL firmada temporal.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') as string
  const url = await getTicketReceiptUrl(event, id)
  if (!url) {
    throw createError({ statusCode: 404, statusMessage: 'Comprobante de transferencia no encontrado' })
  }
  return sendRedirect(event, url, 302)
})
