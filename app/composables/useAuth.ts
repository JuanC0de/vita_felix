import type { AuthContext } from '~/types/auth'

/**
 * Composable de autenticación de la capa de cliente.
 * Delega la validación a Supabase (sesión persistida por cookies SSR) y al
 * endpoint server `/api/auth/session` para obtener la identidad confiable.
 * Los componentes NUNCA toman decisiones de seguridad: la autorización real
 * es server-side (ver server/utils/auth.ts).
 */
export function useAuth() {
  const supabase = useSupabaseClient()
  // Reactivo y persistido entre recargas por el módulo @nuxtjs/supabase (req. 2.5).
  const user = useSupabaseUser()
  const authContext = useState<AuthContext | null>('auth:context', () => null)

  /** Refresca el AuthContext desde el servidor (identidad/empresa/rol). */
  async function refreshContext(): Promise<AuthContext | null> {
    authContext.value = await $fetch<AuthContext>('/api/auth/session').catch(() => null)
    return authContext.value
  }

  /**
   * Inicia sesión con credenciales. Lanza el error de Supabase ante credenciales
   * inválidas para que la UI muestre un mensaje genérico (req. 2.2).
   */
  async function signIn(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    await refreshContext()
  }

  /** Cierra la sesión del lado servidor y del cliente, y limpia el estado. */
  async function signOut(): Promise<void> {
    await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    await supabase.auth.signOut()
    authContext.value = null
    await navigateTo('/login')
  }

  return { user, authContext, signIn, signOut, refreshContext }
}
