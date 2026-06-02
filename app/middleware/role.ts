import type { AppRole } from '~/types/auth'

declare module 'vue-router' {
  interface RouteMeta {
    /** Roles autorizados para la ruta. Definir vía definePageMeta({ requiredRoles }). */
    requiredRoles?: AppRole[]
  }
}

/**
 * Guarda por rol. Bloquea el acceso directo (incluso por URL) a una sección no
 * permitida para el rol del usuario (req. 6.3). La autorización real de datos
 * sigue siendo server-side; esto es la guarda de navegación de UX.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const required = to.meta.requiredRoles
  if (!required || required.length === 0) return

  const { authContext, refreshContext } = useAuth()
  const ctx = authContext.value ?? (await refreshContext())

  if (!ctx || ctx.role === null || !required.includes(ctx.role)) {
    return abortNavigation(createError({ statusCode: 403, statusMessage: 'Acceso denegado' }))
  }
})
