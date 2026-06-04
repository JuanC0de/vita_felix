/**
 * Tipos del dominio de ticketing y check-in.
 *
 * Reglas transversales (req. 2.2, 8.4): la cédula del asistente NUNCA aparece
 * en estos tipos públicos (ni en el QR/PDF/respuestas). Solo vive cifrada en la
 * capa de datos.
 */

/** Estados del ciclo de vida del ticket. Enum cerrado (req. 7.3). */
export const TICKET_STATUSES = ['valid', 'used', 'void'] as const
export type TicketStatus = (typeof TICKET_STATUSES)[number]

/** Asistente registrado (vista server-side; sin cédula en claro). */
export interface Attendee {
  id: string
  companyId: string
  eventId: string
  fullName: string
  email: string
  createdAt: string
}

/** Ticket emitido. `id` es el identificador opaco referenciado por el QR. */
export interface Ticket {
  id: string
  companyId: string
  eventId: string
  tierId: string
  attendeeId: string
  status: TicketStatus
  usedAt: string | null
  pdfPath: string | null
  createdAt: string
}

/** Registro de auditoría de un intento de check-in (req. 6.5). */
export interface Checkin {
  id: string
  companyId: string
  ticketId: string | null
  scannedBy: string | null
  result: string
  createdAt: string
}

/** Tier en su forma pública (sin datos internos sensibles). */
export interface PublicTier {
  id: string
  name: string
  price: number
  currency: string
}

/** Datos públicos de un evento publicado, para el formulario de registro. */
export interface PublicEvent {
  id: string
  name: string
  venue: string
  eventAt: string
  flyerUrl: string | null
  tiers: PublicTier[]
}

/** Payload del formulario público de registro. */
export interface RegistrationInput {
  eventId: string
  tierId: string
  fullName: string
  cedula: string
  email: string
}

/** Modelo saneado del registro (cédula incluida solo en tránsito server-side). */
export interface RegistrationModel {
  fullName: string
  cedula: string
  email: string
  tierId: string
}

/** Resultado del registro entregado al visitante. */
export interface RegistrationResult {
  ticketId: string
  pdfUrl: string
}

/** Resultado de una validación/check-in (req. 7.1). */
export type CheckinResult =
  | { status: 'admitted'; attendee: { fullName: string; tierName: string }; checkedInAt: string }
  | { status: 'already_used'; usedAt: string }
  | {
      status: 'invalid'
      reason: 'signature' | 'expired' | 'malformed' | 'void' | 'event_cancelled' | 'not_found'
    }
