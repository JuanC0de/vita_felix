import type { AppRole, AuthContext } from '../types/auth'
import { isAppRole } from '../types/auth'

/** Forma mínima del usuario de Supabase necesaria para derivar el AuthContext. */
export interface UserLike {
  id: string
  email?: string | null
  app_metadata?: Record<string, unknown> | null
}

/**
 * Mapea un usuario autenticado a un AuthContext. Función pura y testeable
 * (sin dependencias de Nuxt). `role = null` ⇒ `status = 'disabled'` (req. 4.4).
 */
export function buildAuthContext(user: UserLike | null): AuthContext | null {
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

/** ¿El rol indicado está autorizado? (cuenta no habilitada o sin rol ⇒ false). */
export function canAccess(role: AppRole | null | undefined, roles: AppRole[]): boolean {
  return role != null && roles.includes(role)
}

/** ¿El AuthContext está habilitado y autorizado para alguno de los roles? */
export function isAuthorized(ctx: AuthContext | null, roles: AppRole[]): boolean {
  return ctx != null && ctx.status === 'active' && canAccess(ctx.role, roles)
}

/** Filtra una lista de elementos con `roles` según el rol actual. */
export function filterByRole<T extends { roles: AppRole[] }>(
  items: T[],
  role: AppRole | null | undefined,
): T[] {
  return items.filter((item) => canAccess(role, item.roles))
}
