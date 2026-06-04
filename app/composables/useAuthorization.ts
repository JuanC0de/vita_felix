import type { AppRole } from '~/types/auth'
import { canAccess } from '~/utils/authz'

/**
 * Helpers de autorización para la UI (solo UX). La seguridad real se aplica
 * del lado servidor; esto únicamente decide qué mostrar.
 */
export function useAuthorization() {
  const appConfig = useAppConfig()
  const { authContext } = useAuth()

  /** ¿El rol actual está incluido en los roles permitidos? */
  function can(roles: AppRole[]): boolean {
    return canAccess(authContext.value?.role, roles)
  }

  /** Grupos de navegación visibles para el rol actual. */
  const visibleNavGroups = computed(() => {
    const role = authContext.value?.role
    return ((appConfig.navGroups ?? []) as any[])
      .map((group) => ({
        groupName: group.groupName,
        items: group.items.filter((item: any) => canAccess(role, item.roles))
      }))
      .filter((group) => group.items.length > 0)
  })

  return { can, visibleNavGroups }
}
