import { requireUser } from '../../utils/auth'
import { listEvents } from '../../utils/events-repo'

/**
 * GET /api/events
 * Lista los eventos de la empresa del usuario (RLS aplica el aislamiento).
 * Requiere sesión válida (req. 1.1, 3.6, 7.1).
 */
export default defineEventHandler(async (event) => {
  await requireUser(event)
  return await listEvents(event)
})
