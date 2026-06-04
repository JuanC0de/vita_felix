import type { PublicEvent, RegistrationInput, RegistrationResult } from '~/types/ticketing'

/**
 * Composable del registro público (capa de cliente). Consume los endpoints
 * `/api/public/**`; toda la validación, emisión y firma reales son server-side.
 */
export function useRegistration() {
  /** Carga los datos públicos de un evento publicado (req. 1.3). */
  function getEvent(eventId: string): Promise<PublicEvent> {
    return $fetch<PublicEvent>(`/api/public/events/${eventId}`)
  }

  /** Envía el registro y obtiene el ticket emitido (req. 1.1). */
  function register(input: RegistrationInput): Promise<RegistrationResult> {
    return $fetch<RegistrationResult>('/api/public/register', { method: 'POST', body: input })
  }

  return { getEvent, register }
}
