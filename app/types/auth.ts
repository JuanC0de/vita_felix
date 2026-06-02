/**
 * Contrato de identidad compartido por las capas server y cliente, y por las
 * especificaciones aguas abajo (event-management, ticketing-checkin).
 * Cambiar estas formas es un Revalidation Trigger (ver design.md).
 */

/** Los cuatro roles reconocidos por la plataforma. */
export const APP_ROLES = [
  'SUPER_ADMIN',
  'COMPANY_ADMIN',
  'EVENT_MANAGER',
  'GATE_STAFF',
] as const

export type AppRole = (typeof APP_ROLES)[number]

/** Estado de habilitación de la cuenta dentro de la plataforma. */
export type AccountStatus = 'active' | 'disabled'

/**
 * Identidad confiable de un usuario autenticado, resuelta del lado servidor.
 * - `companyId` es `null` para SUPER_ADMIN (acceso transversal) o cuentas no habilitadas.
 * - `role` es `null` cuando la cuenta no está habilitada (sin claim de rol).
 * - `status: 'disabled'` indica un usuario autenticado sin perfil/rol habilitado (req. 4.4).
 */
export interface AuthContext {
  userId: string
  email: string
  companyId: string | null
  role: AppRole | null
  status: AccountStatus
}

/**
 * Claims personalizados inyectados en `app_metadata` del JWT por el
 * Custom Access Token Hook. Nunca se leen desde `user_metadata`.
 */
export interface AppMetadataClaims {
  company_id: string | null
  role: AppRole
}

/** Type guard para validar un valor arbitrario contra los roles reconocidos. */
export function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && (APP_ROLES as readonly string[]).includes(value)
}
