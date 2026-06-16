import type { H3Event } from 'h3'
import { createError } from 'h3'
import { serviceRoleClient, userClient } from './supabase'
import { signToken } from './qr-token'
import { encryptCedula, hashCedula } from './attendee-crypto'
import { generateTicketPdf } from './ticket-pdf'
import { getTicketingSecrets } from './ticketing-config'
import { sendEmail } from './email'
import type {
  CheckinResult,
  PublicEvent,
  RegistrationModel,
  RegistrationResult,
} from '../../app/types/ticketing'

const BUCKET = 'tickets'
const SIGNED_URL_TTL = 60 * 60 * 24 * 7 // 7 días

function fail(message: string, statusCode = 500): never {
  throw createError({ statusCode, statusMessage: message })
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

/**
 * Datos públicos de un evento PUBLICADO + sus tiers (req. 1.3). Usa service role
 * porque el visitante no está autenticado; solo se exponen campos no sensibles.
 */
export async function getPublicEvent(event: H3Event, eventId: string): Promise<PublicEvent | null> {
  const db = serviceRoleClient(event)
  const { data: ev, error } = await db
    .from('events')
    .select('id, name, venue, event_at, status, company_id, flyer_url')
    .eq('id', eventId)
    .maybeSingle()
  if (error) fail('No se pudo cargar el evento')
  const row = ev as unknown as PublicEventRow | null
  if (!row || row.status !== 'published') return null

  const { data: tiers } = await db
    .from('ticket_tiers')
    .select('id, name, price, currency')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  return {
    id: row.id,
    name: row.name,
    venue: row.venue,
    eventAt: row.event_at,
    flyerUrl: row.flyer_url,
    tiers: ((tiers ?? []) as Array<{ id: string; name: string; price: number | string; currency: string }>).map(
      (t) => ({
        id: t.id,
        name: t.name,
        price: typeof t.price === 'string' ? Number(t.price) : t.price,
        currency: t.currency.trim(),
      }),
    ),
  }
}

/**
 * Registro público + emisión del ticket (req. 1.1, 1.4, 2.1, 3, 4).
 * Se ejecuta con SERVICE ROLE (anon no pasa RLS); la empresa se deriva del evento.
 */
export async function registerAndIssue(
  event: H3Event,
  eventId: string,
  model: RegistrationModel,
  receiptFile?: { data: Buffer; filename: string; type: string } | null,
): Promise<RegistrationResult> {
  const db = serviceRoleClient(event)
  const { qrSecret, encKey, graceHours } = getTicketingSecrets()

  // 1) Evento publicado + tier válido del evento.
  const { data: ev } = await db
    .from('events')
    .select('id, name, venue, event_at, status, company_id, flyer_url, theme_config, companies(name)')
    .eq('id', eventId)
    .maybeSingle()
  const eventRow = ev as unknown as PublicEventRow | null
  if (!eventRow || eventRow.status !== 'published') {
    fail('El evento no está disponible para registro', 404)
  }

  const { data: tier } = await db
    .from('ticket_tiers')
    .select('id, name, entry_time_limit')
    .eq('id', model.tierId)
    .eq('event_id', eventId)
    .maybeSingle()
  const tierRow = tier as unknown as { id: string; name: string; entry_time_limit: string | null } | null
  if (!tierRow) fail('La etapa de boletería seleccionada no es válida', 422)

  // 2) Dedup por cédula/evento (req. 1.4).
  const cedulaHash = hashCedula(model.cedula, encKey)
  const { data: existing } = await db
    .from('attendees')
    .select('id')
    .eq('event_id', eventId)
    .eq('cedula_hash', cedulaHash)
    .maybeSingle()
  if (existing) fail('Ya existe un registro con esa cédula para este evento', 409)

  // 3) Insertar asistente (cédula cifrada + hash) (req. 2.1).
  const { data: attendee, error: aErr } = await db
    .from('attendees')
    .insert({
      company_id: eventRow.company_id,
      event_id: eventId,
      full_name: model.fullName,
      email: model.email,
      cedula_enc: encryptCedula(model.cedula, encKey),
      cedula_hash: cedulaHash,
    })
    .select('id')
    .single()
  if (aErr || !attendee) {
    // El UNIQUE(event_id, cedula_hash) actúa como respaldo ante carreras.
    fail('No se pudo completar el registro', 409)
  }
  const attendeeId = (attendee as unknown as { id: string }).id

  // 4) Insertar ticket (estado valid).
  const { data: ticket, error: tErr } = await db
    .from('tickets')
    .insert({
      company_id: eventRow.company_id,
      event_id: eventId,
      tier_id: model.tierId,
      attendee_id: attendeeId,
    })
    .select('id')
    .single()
  if (tErr || !ticket) fail('No se pudo emitir el ticket')
  const ticketId = (ticket as unknown as { id: string }).id

  // 5) Firmar token del QR: exp = fecha del evento + horas de gracia (req. 3.3).
  const eventEpoch = Math.floor(new Date(eventRow.event_at).getTime() / 1000)
  const exp = eventEpoch + graceHours * 3600
  const qrToken = signToken({ sub: ticketId, exp }, qrSecret)

  const entryTimeLimit = tierRow.entry_time_limit ? tierRow.entry_time_limit.substring(0, 5) : null

  // 6) Generar PDF (sin cédula) y subirlo a Storage privado (req. 4.1, 4.2, 4.5).
  const pdfBytes = await generateTicketPdf({
    qrToken,
    eventName: eventRow.name,
    venue: eventRow.venue,
    eventAt: eventRow.event_at,
    tierName: tierRow.name,
    attendeeName: model.fullName,
    ticketId,
    flyerUrl: eventRow.flyer_url,
    themeConfig: eventRow.theme_config,
    organizerName: eventRow.companies ? eventRow.companies.name : null,
    entryTimeLimit,
  })
  const pdfPath = `${ticketId}.pdf`
  const { error: upErr } = await db.storage
    .from(BUCKET)
    .upload(pdfPath, Buffer.from(pdfBytes), { contentType: 'application/pdf', upsert: true })
  if (upErr) fail('No se pudo almacenar el ticket')

  await db.from('tickets').update({ pdf_path: pdfPath }).eq('id', ticketId)

  // 7) Procesar y subir comprobante de transferencia si se suministra.
  if (receiptFile) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(receiptFile.type)) {
      fail('Formato de comprobante inválido. Solo se admiten archivos JPG, PNG, WEBP o PDF.', 422)
    }

    const maxBytes = 5 * 1024 * 1024
    if (receiptFile.data.length > maxBytes) {
      fail('El comprobante excede el tamaño límite permitido de 5 MB.', 422)
    }

    const extension = receiptFile.filename.split('.').pop() ?? 'jpg'
    const receiptPath = `receipts/${ticketId}.${extension}`

    const { error: rcErr } = await db.storage
      .from(BUCKET)
      .upload(receiptPath, receiptFile.data, { contentType: receiptFile.type, upsert: true })

    if (rcErr) fail('No se pudo almacenar el comprobante de transferencia')

    await db.from('tickets').update({ transfer_receipt_path: receiptPath }).eq('id', ticketId)
  }

  // Enviar correo electrónico automático con el ticket PDF
  try {
    const formattedDate = new Date(eventRow.event_at).toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    await sendEmail({
      to: model.email,
      subject: `Tu entrada para ${eventRow.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #4f46e5; margin-bottom: 20px;">¡Hola ${model.fullName}!</h2>
          <p>Tu entrada para el evento <strong>${eventRow.name}</strong> ha sido generada exitosamente.</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #f1f5f9;">
            <p style="margin: 5px 0;"><strong>Evento:</strong> ${eventRow.name}</p>
            <p style="margin: 5px 0;"><strong>Fecha:</strong> ${formattedDate}</p>
            <p style="margin: 5px 0;"><strong>Lugar:</strong> ${eventRow.venue}</p>
            <p style="margin: 5px 0;"><strong>Tipo de Entrada:</strong> ${tierRow.name}</p>
            ${entryTimeLimit ? `<p style="margin: 5px 0; color: #b45309;"><strong>Límite de ingreso:</strong> Ingreso válido hasta las ${entryTimeLimit}</p>` : ''}
          </div>

          <p>Adjunto a este correo encontrarás tu ticket de ingreso en formato PDF con el código QR de acceso.</p>
          <p>Por favor, asegúrate de presentarlo en la entrada del evento.</p>
          
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b; text-align: center;">Este es un correo automático de confirmación de Vita Felix.</p>
        </div>
      `,
      attachments: [
        {
          filename: `ticket_${ticketId.substring(0, 8)}.pdf`,
          content: Buffer.from(pdfBytes),
          contentType: 'application/pdf'
        }
      ]
    })
  } catch (emailErr) {
    console.error('Error al intentar enviar el correo automático:', emailErr)
  }

  const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(pdfPath, SIGNED_URL_TTL)
  return { ticketId, pdfUrl: signed?.signedUrl ?? '' }
}

/** Devuelve una URL firmada fresca del comprobante de transferencia. */
export async function getTicketReceiptUrl(event: H3Event, ticketId: string): Promise<string | null> {
  const db = serviceRoleClient(event)
  const { data: ticket } = await db
    .from('tickets')
    .select('transfer_receipt_path')
    .eq('id', ticketId)
    .maybeSingle()
  const path = (ticket as unknown as { transfer_receipt_path: string | null } | null)?.transfer_receipt_path
  if (!path) return null
  const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL)
  return signed?.signedUrl ?? null
}

/** Devuelve una URL firmada fresca del PDF de un ticket (req. 4.2). */
export async function getTicketPdfUrl(event: H3Event, ticketId: string): Promise<string | null> {
  const db = serviceRoleClient(event)
  const { data: ticket } = await db
    .from('tickets')
    .select('pdf_path')
    .eq('id', ticketId)
    .maybeSingle()
  const path = (ticket as unknown as { pdf_path: string | null } | null)?.pdf_path
  if (!path) return null
  const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL)
  return signed?.signedUrl ?? null
}

interface CheckinRpcRow {
  result: string
  used_at: string | null
  full_name: string | null
  tier_name: string | null
  surcharge_applied: boolean | null
  surcharge_amount: number | string | null
}

/**
 * Check-in atómico vía RPC `checkin_ticket` con el cliente de USUARIO (RLS escopa
 * por empresa). La atomicidad y la auditoría viven en la función SQL (req. 5,6,7).
 */
export async function checkinTicket(event: H3Event, ticketId: string): Promise<CheckinResult> {
  const client = await userClient(event)
  const { data, error } = await client.rpc('checkin_ticket', { p_ticket_id: ticketId })
  if (error) fail('No se pudo procesar el check-in')

  const row = ((data ?? []) as unknown as CheckinRpcRow[])[0]
  if (!row) return { status: 'invalid', reason: 'not_found' }

  if (row.result === 'admitted') {
    return {
      status: 'admitted',
      attendee: { fullName: row.full_name ?? '', tierName: row.tier_name ?? '' },
      checkedInAt: row.used_at ?? new Date().toISOString(),
      surchargeApplied: !!row.surcharge_applied,
      surchargeAmount: typeof row.surcharge_amount === 'string' ? Number(row.surcharge_amount) : (row.surcharge_amount ?? 0),
    }
  }
  if (row.result === 'already_used') {
    return { status: 'already_used', usedAt: row.used_at ?? '' }
  }
  if (row.result === 'invalid:event_cancelled') {
    return { status: 'invalid', reason: 'event_cancelled' }
  }
  if (row.result === 'invalid:not_found') {
    return { status: 'invalid', reason: 'not_found' }
  }
  return { status: 'invalid', reason: 'void' }
}
