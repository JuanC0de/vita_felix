import type { EventStatus, StatusAction } from '../../app/types/events'

/**
 * Máquina de transiciones del ciclo de vida del evento. Lógica pura y testeable
 * (sin dependencias de Nuxt/Supabase). La verificación de "publicar exige ≥1 tier"
 * se hace en el server route con datos del repositorio (req. 4.2, 4.3).
 *
 * Transiciones permitidas (req. 4.4, 4.5):
 *   - draft     → published | cancelled
 *   - published → finished  | cancelled
 *   - finished  → (terminal)
 *   - cancelled → (terminal)
 */
const TRANSITIONS: Record<EventStatus, Partial<Record<StatusAction, EventStatus>>> = {
  draft: { publish: 'published', cancel: 'cancelled' },
  published: { finish: 'finished', cancel: 'cancelled' },
  finished: {},
  cancelled: {},
}

/** Estado destino de aplicar `action` sobre `current`, o `null` si no se permite. */
export function nextStatus(current: EventStatus, action: StatusAction): EventStatus | null {
  return TRANSITIONS[current]?.[action] ?? null
}

/** ¿La transición está permitida desde el estado actual? */
export function isTransitionAllowed(current: EventStatus, action: StatusAction): boolean {
  return nextStatus(current, action) !== null
}

/** Solo el estado `published` está abierto al registro público (req. 4.6). */
export function isOpenForRegistration(status: EventStatus): boolean {
  return status === 'published'
}
