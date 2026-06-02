import type { NavItem } from '~/app.config'
import type { AppRole } from '~/types/auth'

/**
 * Helpers de autorización para la UI (solo UX). La seguridad real se aplica
 * del lado servidor; esto únicamente decide qué mostrar.
 */
export function useAuthorization() {
  const appConfig = useAppConfig()
  const { authContext } = useAuth()

  /** ¿El rol actual está incluido en los roles permitidos? */
  function can(roles: AppRole[]): boolean {
    const role = authContext.value?.role
    return role != null && roles.includes(role)
  }

  /** Entradas de navegación visibles para el rol actual (req. 6.2). */
  const visibleNav = computed<NavItem[]>(() =>
    ((appConfig.nav ?? []) as NavItem[]).filter((item) => can(item.roles)),
  )

  return { can, visibleNav }
}
