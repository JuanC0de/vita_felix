import { createError, getRouterParam, sendRedirect } from 'h3'
import { getTicketPdfUrl } from '../../../utils/tickets-repo'

/**
 * GET /api/tickets/:id/pdf
 * Redirige a una URL firmada fresca del PDF del ticket (req. 4.2). El id del
 * ticket es opaco; el PDF no contiene la cédula. Acceso vía URL firmada temporal.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') as string
  const url = await getTicketPdfUrl(event, id)
  if (!url) {
    throw createError({ statusCode: 404, statusMessage: 'Ticket no encontrado' })
  }
  return sendRedirect(event, url, 302)
})
