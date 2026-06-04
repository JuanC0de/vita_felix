/**
 * Interceptor de peticiones HTTP en el lado del servidor (SSR).
 * Reenvía la cabecera cookie en todas las peticiones internas realizadas
 * mediante $fetch para conservar la sesión del usuario durante la carga inicial.
 */
export default defineNuxtPlugin(() => {
  const cookie = useRequestHeaders(['cookie'])

  if (cookie.cookie) {
    const originalFetch = globalThis.$fetch
    globalThis.$fetch = ((request: any, options: any = {}) => {
      if (typeof request === 'string' && request.startsWith('/')) {
        const headers = options.headers || {}
        if (headers instanceof Headers) {
          headers.set('cookie', cookie.cookie)
        } else if (Array.isArray(headers)) {
          headers.push(['cookie', cookie.cookie])
        } else {
          options.headers = {
            cookie: cookie.cookie,
            ...headers,
          }
        }
      }
      return originalFetch(request, options)
    }) as any
  }
})
