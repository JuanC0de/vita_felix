import { getAuthContext } from '../utils/auth'
import type { AuthContext } from '~/types/auth'

declare module 'h3' {
  interface H3EventContext {
    /** Identidad resuelta del lado servidor para la petición actual (o null). */
    auth?: AuthContext | null
  }
}

/**
 * Resuelve el AuthContext una vez por petición de API y lo deja disponible en
 * `event.context.auth` para los manejadores, de forma consistente (req. 3.6).
 * Solo se ejecuta para rutas `/api/` para no añadir overhead a assets/SSR.
 */
export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/')) return
  event.context.auth = await getAuthContext(event)
})
