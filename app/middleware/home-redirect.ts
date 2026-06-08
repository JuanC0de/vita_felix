/**
 * Redirige / según el rol del usuario autenticado.
 * SUPER_ADMIN → dashboard global; GATE_STAFF → escáner QR.
 */
export default defineNuxtRouteMiddleware(async () => {
  const { authContext, refreshContext } = useAuth()
  const ctx = authContext.value ?? await refreshContext()
  if (!ctx) return

  if (ctx.role === 'SUPER_ADMIN') {
    return navigateTo('/admin/dashboard')
  }
  if (ctx.role === 'GATE_STAFF') {
    return navigateTo('/scan')
  }
})
