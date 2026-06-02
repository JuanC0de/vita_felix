import type { NavItem } from '~/app.config'
import type { AppRole } from '~/types/auth'
import { canAccess, filterByRole } from '~/utils/authz'

/**
 * Helpers de autorización para la UI (solo UX). La seguridad real se aplica
 * del lado servidor; esto únicamente decide qué mostrar. La lógica de decisión
 * es pura (ver `~/utils/authz`) y está cubierta por pruebas unitarias.
 */
export function useAuthorization() {
  const appConfig = useAppConfig()
  const { authContext } = useAuth()

  /** ¿El rol actual está incluido en los roles permitidos? */
  function can(roles: AppRole[]): boolean {
    return canAccess(authContext.value?.role, roles)
  }

  /** Entradas de navegación visibles para el rol actual (req. 6.2). */
  const visibleNav = computed<NavItem[]>(() =>
    filterByRole((appConfig.nav ?? []) as NavItem[], authContext.value?.role),
  )

  return { can, visibleNav }
}
