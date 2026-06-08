import type { H3Event } from 'h3'
import { createError } from 'h3'
import { serviceRoleClient, userClient } from './supabase'
import { encryptCedula, hashCedula } from './attendee-crypto'
import { getTicketingSecrets } from './ticketing-config'
import { signToken } from './qr-token'
import { generateTicketPdf } from './ticket-pdf'
import type {
  EventHost,
  EventHostCreate,
  InvitationStatus,
  GuestRegistration,
} from '../../app/types/invitations'
import type { RegistrationResult } from '../../app/types/ticketing'

const BUCKET = 'tickets'
const SIGNED_URL_TTL = 60 * 60 * 24 * 7 // 7 días

interface DatabaseHostRow {
  id: string
  company_id: string
  event_id: string
  tier_id: string | null
  name: string
  role: string
  max_guests: number
  token: string
  created_at: string
  attendees?: Array<{ id: string }>
}

interface PublicEventRow {
  id: string
  name: string
  venue: string
  event_at: string
  status: string
  company_id: string
  flyer_url: string | null
  theme_config: any | null
  companies: { name: string } | null
}

function fail(message: string, statusCode = 500): never {
  throw createError({ statusCode, statusMessage: message })
}

/**
 * Convierte un registro de base de datos a la interfaz de dominio EventHost.
 */
function mapHost(row: DatabaseHostRow): EventHost {
  return {
    id: row.id,
    companyId: row.company_id,
    eventId: row.event_id,
    tierId: row.tier_id,
    name: row.name,
    role: row.role,
    maxGuests: row.max_guests,
    token: row.token,
    createdAt: row.created_at,
    guestsRegisteredCount: row.attendees ? row.attendees.length : 0,
  }
}

/**
 * Crea un nuevo anfitrión (DJs, socio, promotor) para un evento.
 * Se ejecuta bajo el rol del organizador (RLS habilitado).
 */
export async function createHost(
  event: H3Event,
  eventId: string,
  model: EventHostCreate
): Promise<EventHost> {
  const client = await userClient(event)

  // Obtener la empresa del evento
  const { data: ev, error: evErr } = await client
    .from('events')
    .select('company_id')
    .eq('id', eventId)
    .single()

  if (evErr || !ev) {
    fail('No se pudo encontrar el evento especificado', 404)
  }

  const { data, error } = await (client.from('event_hosts') as any)
    .insert({
      company_id: ev.company_id,
      event_id: eventId,
      tier_id: model.tierId || null,
      name: model.name,
      role: model.role,
      max_guests: model.maxGuests,
    })
    .select('*')
    .single()

  if (error) {
    fail('No se pudo registrar el anfitrión de invitación')
  }

  return mapHost(data as DatabaseHostRow)
}

/**
 * Lista todos los anfitriones registrados para un evento.
 * Se ejecuta bajo el rol del organizador (RLS habilitado).
 */
export async function listHosts(event: H3Event, eventId: string): Promise<EventHost[]> {
  const client = await userClient(event)
  const { data, error } = await (client.from('event_hosts') as any)
    .select('*, attendees(id)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error) {
    fail('No se pudo listar los anfitriones del evento')
  }

  return (data as DatabaseHostRow[]).map(mapHost)
}

/**
 * Valida la existencia y disponibilidad de un token de invitación.
 * Se ejecuta públicamente utilizando Service Role.
 */
export async function getInvitationStatus(
  event: H3Event,
  eventId: string,
  token: string
): Promise<InvitationStatus> {
  const db = serviceRoleClient(event)

  const { data: host, error: hErr } = await (db.from('event_hosts') as any)
    .select('id, name, max_guests, attendees(id)')
    .eq('event_id', eventId)
    .eq('token', token)
    .maybeSingle()

  if (hErr || !host) {
    return {
      valid: false,
      eventName: '',
      hostName: '',
      maxGuests: 0,
      guestsRegisteredCount: 0,
      guestsRemaining: 0,
      flyerUrl: null,
      themeConfig: null,
    }
  }

  const { data: ev, error: evErr } = await db
    .from('events')
    .select('name, status, flyer_url, theme_config')
    .eq('id', eventId)
    .single()

  if (evErr || !ev || ev.status !== 'published') {
    return {
      valid: false,
      eventName: '',
      hostName: '',
      maxGuests: 0,
      guestsRegisteredCount: 0,
      guestsRemaining: 0,
      flyerUrl: null,
      themeConfig: null,
    }
  }

  const hostRow = host as unknown as { id: string; name: string; max_guests: number; attendees: Array<{ id: string }> }
  const registeredCount = hostRow.attendees ? hostRow.attendees.length : 0
  const remaining = Math.max(0, hostRow.max_guests - registeredCount)

  return {
    valid: true,
    eventName: ev.name,
    hostName: hostRow.name,
    maxGuests: hostRow.max_guests,
    guestsRegisteredCount: registeredCount,
    guestsRemaining: remaining,
    flyerUrl: ev.flyer_url,
    themeConfig: ev.theme_config,
  }
}

/**
 * Registra un invitado a través de un token de invitación atómico.
 * Se ejecuta de manera pública con Service Role.
 */
export async function registerGuestInvitation(
  event: H3Event,
  eventId: string,
  token: string,
  model: GuestRegistration
): Promise<RegistrationResult> {
  const db = serviceRoleClient(event)
  const { qrSecret, encKey, graceHours } = getTicketingSecrets()

  // 1) Obtener los datos públicos del evento y del anfitrión
  const { data: ev } = await db
    .from('events')
    .select('id, name, venue, event_at, status, company_id, flyer_url, theme_config, companies(name)')
    .eq('id', eventId)
    .maybeSingle()

  const eventRow = ev as unknown as PublicEventRow | null
  if (!eventRow || eventRow.status !== 'published') {
    fail('El evento no está disponible para registro', 404)
  }

  // 2) Invocar la transacción atómica SQL register_guest
  const cedulaHash = hashCedula(model.cedula, encKey)
  const { data: ticketId, error: rpcErr } = await (db as any).rpc('register_guest', {
    p_event_id: eventId,
    p_token: token,
    p_full_name: model.fullName,
    p_email: model.email,
    p_cedula_enc: encryptCedula(model.cedula, encKey),
    p_cedula_hash: cedulaHash,
  })

  if (rpcErr || !ticketId) {
    if (rpcErr?.message?.includes('invitaciones') || rpcErr?.code === 'P0003') {
      fail('Las invitaciones para este enlace se han agotado', 422)
    }
    if (rpcErr?.message?.includes('cédula') || rpcErr?.code === '23505') {
      fail('Ya existe un registro con esa cédula para este evento', 409)
    }
    fail(rpcErr?.message || 'No se pudo completar el registro de cortesía')
  }

  // 3) Recuperar los datos de la categoría de ticket para el PDF
  const { data: ticketData } = await db
    .from('tickets')
    .select('ticket_tiers(name)')
    .eq('id', ticketId)
    .single()

  const tierName = (ticketData as any)?.ticket_tiers?.name || 'Cortesía'

  // Obtener el nombre del anfitrión (host) para el PDF
  const { data: hostData } = await (db.from('event_hosts') as any)
    .select('name')
    .eq('event_id', eventId)
    .eq('token', token)
    .maybeSingle()

  const hostName = hostData ? (hostData as any).name : null

  // 4) Firmar token para el QR del ticket
  const eventEpoch = Math.floor(new Date(eventRow.event_at).getTime() / 1000)
  const exp = eventEpoch + graceHours * 3600
  const qrToken = signToken({ sub: ticketId as string, exp }, qrSecret)

  // 5) Generar el archivo PDF del ticket
  const pdfBytes = await generateTicketPdf({
    qrToken,
    eventName: eventRow.name,
    venue: eventRow.venue,
    eventAt: eventRow.event_at,
    tierName,
    attendeeName: model.fullName,
    ticketId: ticketId as string,
    flyerUrl: eventRow.flyer_url,
    themeConfig: eventRow.theme_config,
    organizerName: eventRow.companies ? eventRow.companies.name : null,
    isSpecialGuest: true,
    hostName,
  })

  // 6) Subir a Storage
  const pdfPath = `${ticketId}.pdf`
  const { error: upErr } = await db.storage
    .from(BUCKET)
    .upload(pdfPath, Buffer.from(pdfBytes), { contentType: 'application/pdf', upsert: true })

  if (upErr) {
    fail('No se pudo almacenar el ticket PDF')
  }

  // 7) Guardar la ruta en la base de datos
  await db.from('tickets').update({ pdf_path: pdfPath }).eq('id', ticketId)

  // 8) Crear enlace firmado para retorno
  const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(pdfPath, SIGNED_URL_TTL)

  return {
    ticketId: ticketId as string,
    pdfUrl: signed?.signedUrl ?? '',
  }
}
