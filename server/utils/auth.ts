import { serverSupabaseUser } from '#supabase/server'
import { createError, type H3Event } from 'h3'
import type { AppRole, AuthContext } from '~/types/auth'
import { buildAuthContext, isAuthorized } from '~/utils/authz'

/**
 * Deriva el AuthContext desde la sesión validada del lado servidor.
 * La identidad proviene de `serverSupabaseUser` (verifica el JWT contra Supabase);
 * nunca se confía en valores enviados por el cliente. La lógica de mapeo es pura
 * (ver `~/utils/authz`) y está cubierta por pruebas unitarias.
 */
export async function getAuthContext(event: H3Event): Promise<AuthContext | null> {
  const user = await serverSupabaseUser(event).catch(() => null)
  if (!user) return null
  // `serverSupabaseUser` puede devolver un User (id) o el payload del JWT (sub).
  const u = user as {
    id?: string
    sub?: string
    email?: string | null
    app_metadata?: Record<string, unknown> | null
  }
  return buildAuthContext({
    id: u.id ?? u.sub ?? '',
    email: u.email ?? null,
    app_metadata: u.app_metadata ?? null,
  })
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
  if (!isAuthorized(ctx, roles)) {
    throw createError({ statusCode: 403, statusMessage: 'Acceso denegado' })
  }
  return ctx
}
