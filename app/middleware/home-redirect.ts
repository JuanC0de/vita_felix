/**
 * Redirige / según el rol del usuario autenticado.
 * SUPER_ADMIN → dashboard global; GATE_STAFF → escáner QR.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const { authContext, refreshContext } = useAuth()
  const ctx = authContext.value ?? await refreshContext()
  if (!ctx) return

  if (ctx.role === 'SUPER_ADMIN' && to.path !== '/admin/dashboard') {
    return navigateTo('/admin/dashboard')
  }
  if (ctx.role === 'GATE_STAFF' && to.path !== '/scan') {
    return navigateTo('/scan')
  }
  if ((ctx.role === 'COMPANY_ADMIN' || ctx.role === 'EVENT_MANAGER') && to.path !== '/dashboard') {
    return navigateTo('/dashboard')
  }
})
