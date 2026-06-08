/**
 * Contratos de dominio de lista de invitados y cortesías automatizadas.
 */

export interface EventHost {
  id: string
  companyId: string
  eventId: string
  tierId: string | null
  name: string
  role: string
  maxGuests: number
  token: string
  createdAt: string
  // Agregados para métricas del dashboard
  guestsRegisteredCount?: number
}

export interface EventHostCreate {
  name: string
  role: string
  maxGuests: number
  tierId?: string | null
}

export interface InvitationStatus {
  valid: boolean
  eventName: string
  hostName: string
  maxGuests: number
  guestsRegisteredCount: number
  guestsRemaining: number
  flyerUrl: string | null
  themeConfig: any | null
}

export interface GuestRegistration {
  fullName: string
  email: string
  cedula: string
}
