import type { CheckinResult } from '~/types/ticketing'

/**
 * Composable de check-in (capa de cliente, GATE_STAFF). Envía el token escaneado
 * al servidor, que valida firma/expiración/estado y realiza el check-in atómico.
 * El cliente NO decide la validez (req. 5.5).
 */
export function useCheckin() {
  function validate(token: string): Promise<CheckinResult> {
    return $fetch<CheckinResult>('/api/checkin/validate', { method: 'POST', body: { token } })
  }

  return { validate }
}
