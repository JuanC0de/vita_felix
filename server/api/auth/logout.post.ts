import { serverSupabaseClient } from '#supabase/server'
import { createError } from 'h3'
import { requireUser } from '../../utils/auth'

/**
 * POST /api/auth/logout
 * Cierra la sesión activa del lado servidor. Requiere sesión (401 si no hay).
 * (req. 2.3)
 */
export default defineEventHandler(async (event) => {
  await requireUser(event)
  const client = await serverSupabaseClient(event)
  const { error } = await client.auth.signOut()
  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'No se pudo cerrar la sesión' })
  }
  return { ok: true }
})
