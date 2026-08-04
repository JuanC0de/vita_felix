import { createError, getQuery } from 'h3'
import { serviceRoleClient } from '../../../utils/supabase'

const BUCKET = 'tickets'
const SIGNED_URL_TTL = 60 * 60 * 24 * 7 // 7 días

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const reference = typeof query.reference === 'string' ? query.reference.trim() : ''

  if (!reference) {
    throw createError({ statusCode: 400, statusMessage: 'Falta la referencia de la transacción.' })
  }

  const db = serviceRoleClient(event)

  // 1) Obtener la transacción de pago
  const { data: tx, error: txError } = await db
    .from('payment_transactions')
    .select('id, event_id, status, attendees_data')
    .eq('reference', reference)
    .maybeSingle()

  if (txError || !tx) {
    throw createError({ statusCode: 404, statusMessage: 'Transacción no encontrada.' })
  }

  if (tx.status !== 'approved') {
    return { status: tx.status, tickets: [] }
  }

  const attendeesData = tx.attendees_data as Array<{
    tierId: string
    fullName: string
    email: string
    cedula: string
  }>

  const emails = attendeesData.map((a) => a.email.toLowerCase())

  // 2) Consultar los asistentes insertados
  const { data: attendees, error: attError } = await db
    .from('attendees')
    .select('id, full_name, email')
    .eq('event_id', tx.event_id)
    .in('email', emails)

  if (attError || !attendees || attendees.length === 0) {
    return { status: 'approved', tickets: [] }
  }

  const attendeeIds = attendees.map((a) => a.id)

  // 3) Consultar los tickets correspondientes
  const { data: tickets, error: tkError } = await db
    .from('tickets')
    .select(`
      id,
      pdf_path,
      attendee_id,
      ticket_tiers (
        name
      )
    `)
    .in('attendee_id', attendeeIds)
    .eq('event_id', tx.event_id)

  if (tkError || !tickets) {
    throw createError({ statusCode: 500, statusMessage: 'Error al recuperar los tickets emitidos.' })
  }

  // 4) Firmar las URLs de los PDFs
  const enrichedTickets = await Promise.all(
    (tickets as any[]).map(async (t) => {
      const attendee = attendees.find((a) => a.id === t.attendee_id)
      let pdfUrl = ''
      if (t.pdf_path) {
        const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(t.pdf_path, SIGNED_URL_TTL)
        pdfUrl = signed?.signedUrl ?? ''
      }

      return {
        ticketId: t.id,
        fullName: attendee?.full_name ?? 'Asistente',
        email: attendee?.email ?? '',
        tierName: t.ticket_tiers?.name ?? 'Entrada',
        pdfUrl,
      }
    })
  )

  return {
    status: 'approved',
    tickets: enrichedTickets,
  }
})
