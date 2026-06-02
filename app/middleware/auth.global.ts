/**
 * Guarda global de sesión.
 * - Sin sesión en una ruta protegida ⇒ redirige a /login (req. 2.4).
 * - Con sesión en /login ⇒ redirige al Dashboard (req. 5.4).
 */
const PUBLIC_ROUTES = ['/login', '/confirm']

export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()
  const isPublic = PUBLIC_ROUTES.includes(to.path)

  if (!user.value && !isPublic) {
    return navigateTo('/login')
  }

  if (user.value && to.path === '/login') {
    return navigateTo('/')
  }
})
