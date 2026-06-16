/**
 * Contratos de dominio de event-management: eventos y etapas de boletería.
 * Consumidos por la capa server, los composables y, aguas abajo, por
 * `ticketing-checkin`. Cambiar estas formas es un Revalidation Trigger
 * (ver .kiro/specs/event-management/design.md).
 */

/** Estados del ciclo de vida de un evento. Enum cerrado (req. 4.1). */
export const EVENT_STATUSES = ['draft', 'published', 'finished', 'cancelled'] as const

export type EventStatus = (typeof EVENT_STATUSES)[number]

/** Acciones de transición de estado disponibles (req. 4.2, 4.4). */
export const STATUS_ACTIONS = ['publish', 'finish', 'cancel'] as const

export type StatusAction = (typeof STATUS_ACTIONS)[number]

/** Configuración del diseño/tema visual de las boletas del evento. */
export interface EventThemeConfig {
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  gradientStart?: string
  gradientEnd?: string
  heroBackground?: string
  logoUrl?: string | null
}

/** Evento musical perteneciente a una empresa. */
export interface Event {
  id: string
  companyId: string
  name: string
  venue: string
  /** Fecha/hora del evento en ISO 8601. */
  eventAt: string
  status: EventStatus
  description: string | null
  flyerUrl: string | null
  themeConfig: EventThemeConfig | null
  createdAt: string
  updatedAt: string
}

/** Etapa de boletería de un evento (p. ej. preventa, general, VIP). */
export interface TicketTier {
  id: string
  eventId: string
  companyId: string
  name: string
  /** Precio monetario, mayor o igual a cero (0 = gratis). */
  price: number
  /** Moneda en formato ISO 4217 (tres letras mayúsculas). */
  currency: string
  /** Cupo entero, mayor o igual a cero. */
  quota: number
  entryTimeLimit?: string | null
  surchargeAmount?: number
  createdAt: string
  updatedAt: string
}

/** Payload para crear un evento. */
export interface EventCreate {
  name: string
  venue: string
  eventAt: string
  description?: string | null
  flyerUrl?: string | null
  themeConfig?: EventThemeConfig | null
}

/** Payload para actualizar un evento (mismos campos editables que al crear). */
export type EventUpdate = EventCreate

/** Modelo saneado de evento tras validación server-side. */
export interface EventWriteModel {
  name: string
  venue: string
  eventAt: string
  description: string | null
  flyerUrl: string | null
  themeConfig: EventThemeConfig | null
}

/** Payload para crear una etapa de boletería. */
export interface TierCreate {
  name: string
  price: number
  currency: string
  quota: number
  entryTimeLimit?: string | null
  surchargeAmount?: number
}

/** Payload para actualizar una etapa de boletería. */
export type TierUpdate = TierCreate

/** Modelo saneado de tier tras validación server-side. */
export interface TierWriteModel {
  name: string
  price: number
  currency: string
  quota: number
  entryTimeLimit: string | null
  surchargeAmount: number
}

/** Evento con sus etapas de boletería embebidas (respuesta de detalle). */
export interface EventWithTiers extends Event {
  tiers: TicketTier[]
}
