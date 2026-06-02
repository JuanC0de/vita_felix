import { serverSupabaseUser } from '#supabase/server'
import { createError, type H3Event } from 'h3'
import { isAppRole, type AppRole, type AuthContext } from '~/types/auth'

/**
 * Deriva el AuthContext desde la sesión validada del lado servidor.
 * La identidad proviene de `serverSupabaseUser` (verifica el JWT contra Supabase);
 * nunca se confía en valores enviados por el cliente.
 *
 * Devuelve `null` si no hay sesión válida. Para un usuario autenticado sin claim
 * de rol (sin perfil habilitado), devuelve `status: 'disabled'` y `role: null`.
 */
export async function getAuthContext(event: H3Event): Promise<AuthContext | null> {
  const user = await serverSupabaseUser(event).catch(() => null)
  if (!user) return null

  const meta = (user.app_metadata ?? {}) as Record<string, unknown>
  const role: AppRole | null = isAppRole(meta.role) ? meta.role : null
  const companyId = typeof meta.company_id === 'string' ? meta.company_id : null

  return {
    userId: user.id,
    email: user.email ?? '',
    companyId: role ? companyId : null,
    role,
    status: role ? 'active' : 'disabled',
  }
}

/**
 * Exige una sesión válida. Lanza 401 si no la hay (req. 1.5, 2.6, 7.1).
 */
export async function requireUser(event: H3Event): Promise<AuthContext> {
  const ctx = await getAuthContext(event)
  if (!ctx) {
    throw createError({ statusCode: 401, statusMessage: 'No autenticado' })
  }
  return ctx
}

/**
 * Exige que el usuario tenga uno de los roles permitidos.
 * Lanza 403 si la cuenta no está habilitada o el rol no está autorizado,
 * sin filtrar datos sensibles en el mensaje (req. 3.2, 3.3, 3.4, 3.5, 4.4, 7.3).
 */
export async function requireRole(event: H3Event, roles: AppRole[]): Promise<AuthContext> {
  const ctx = await requireUser(event)
  if (ctx.status === 'disabled' || ctx.role === null || !roles.includes(ctx.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Acceso denegado' })
  }
  return ctx
}
