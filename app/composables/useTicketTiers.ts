import type { TicketTier, TierCreate, TierUpdate } from '~/types/events'

/**
 * Composable de gestión de etapas de boletería de un evento (capa de cliente).
 * Consume `/api/events/:eventId/tiers/**` vía `$fetch`. Validación y
 * autorización reales son server-side.
 */
export function useTicketTiers(eventId: string) {
  const base = `/api/events/${eventId}/tiers`

  /** Lista las etapas de boletería del evento (req. 5.5). */
  function list(): Promise<TicketTier[]> {
    return $fetch<TicketTier[]>(base)
  }

  /** Crea una etapa de boletería. */
  function create(payload: TierCreate): Promise<TicketTier> {
    return $fetch<TicketTier>(base, { method: 'POST', body: payload })
  }

  /** Actualiza una etapa de boletería. */
  function update(tierId: string, payload: TierUpdate): Promise<TicketTier> {
    return $fetch<TicketTier>(`${base}/${tierId}`, { method: 'PUT', body: payload })
  }

  /** Elimina una etapa de boletería. */
  function remove(tierId: string): Promise<{ ok: true }> {
    return $fetch<{ ok: true }>(`${base}/${tierId}`, { method: 'DELETE' })
  }

  return { list, create, update, remove }
}
