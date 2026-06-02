import { requireUser } from '../../utils/auth'

/**
 * GET /api/auth/session
 * Devuelve el AuthContext del usuario autenticado. Responde 401 sin sesión.
 * (req. 2.1, 1.5)
 */
export default defineEventHandler(async (event) => {
  return await requireUser(event)
})
