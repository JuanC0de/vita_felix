import type {
  Event,
  EventCreate,
  EventUpdate,
  EventWithTiers,
  StatusAction,
} from '~/types/events'

/**
 * Composable de gestión de eventos (capa de cliente). Consume los server routes
 * `/api/events/**` vía `$fetch`; toda la autorización y validación reales son
 * server-side. Los componentes NO toman decisiones de seguridad.
 */
export function useEvents() {
  /** Lista los eventos de la empresa del usuario (req. 3.6). */
  function list(): Promise<Event[]> {
    return $fetch<Event[]>('/api/events')
  }

  /** Obtiene un evento con sus etapas de boletería. */
  function get(id: string): Promise<EventWithTiers> {
    return $fetch<EventWithTiers>(`/api/events/${id}`)
  }

  /** Crea un evento (estado inicial borrador). */
  function create(payload: EventCreate): Promise<Event> {
    return $fetch<Event>('/api/events', { method: 'POST', body: payload })
  }

  /** Actualiza un evento. */
  function update(id: string, payload: EventUpdate): Promise<Event> {
    return $fetch<Event>(`/api/events/${id}`, { method: 'PUT', body: payload })
  }

  /** Elimina un evento (y sus tiers en cascada). */
  function remove(id: string): Promise<{ ok: true }> {
    return $fetch<{ ok: true }>(`/api/events/${id}`, { method: 'DELETE' })
  }

  /** Aplica una transición de estado (publicar/finalizar/cancelar) (req. 4.2). */
  function setStatus(id: string, action: StatusAction): Promise<Event> {
    return $fetch<Event>(`/api/events/${id}/status`, { method: 'PATCH', body: { action } })
  }

  return { list, get, create, update, remove, setStatus }
}
