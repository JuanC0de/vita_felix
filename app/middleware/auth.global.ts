/**
 * Guarda global de sesión.
 * - Sin sesión en una ruta protegida ⇒ redirige a /login (req. 2.4).
 * - Con sesión en /login ⇒ redirige al Dashboard (req. 5.4).
 */
const PUBLIC_ROUTES = ['/login', '/confirm']
// Prefijos públicos sin sesión: registro de asistentes y vista de ticket
// (ticketing-checkin, req. 1.5).
const PUBLIC_PREFIXES = ['/e/', '/t/']

export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()
  const isPublic =
    to.meta.public === true ||
    PUBLIC_ROUTES.includes(to.path) ||
    PUBLIC_PREFIXES.some((p) => to.path.startsWith(p))

  if (!user.value && !isPublic) {
    return navigateTo('/login')
  }

  if (user.value && to.path === '/login') {
    return navigateTo('/')
  }
})
