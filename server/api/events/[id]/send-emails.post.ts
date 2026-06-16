import { createError, getRouterParam } from 'h3'
import { requireRole } from '../../../utils/auth'
import { serviceRoleClient } from '../../../utils/supabase'
import { sendEmail } from '../../../utils/email'

/**
 * POST /api/events/[id]/send-emails
 * Realiza el envío masivo de los correos electrónicos con sus respectivos tickets
 * adjuntos a todos los asistentes con boletas válidas/activas del evento.
 * Solo accesible para SUPER_ADMIN, COMPANY_ADMIN o EVENT_MANAGER.
 */
export default defineEventHandler(async (event) => {
  const ctx = await requireRole(event, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER'])
  const id = getRouterParam(event, 'id') as string

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Falta el identificador de evento' })
  }

  const db = serviceRoleClient(event)

  // 1) Obtener detalles del evento para validar pertenencia y seguridad
  const { data: ev, error: evErr } = await db
    .from('events')
    .select('company_id')
    .eq('id', id)
    .maybeSingle()

  if (evErr || !ev) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado' })
  }

  // 2) Validar pertenencia del evento a la empresa del usuario si no es SUPER_ADMIN
  if (ctx.role !== 'SUPER_ADMIN' && ctx.companyId !== ev.company_id) {
    throw createError({ statusCode: 403, statusMessage: 'Acceso denegado' })
  }

  // 3) Obtener todos los tickets activos (no anulados) del evento
  const { data: tickets, error: tErr } = await db
    .from('tickets')
    .select('*, attendees(full_name, email), events(name, event_at, venue), ticket_tiers(name)')
    .eq('event_id', id)
    .neq('status', 'void') as any

  if (tErr || !tickets) {
    throw createError({ statusCode: 500, statusMessage: 'No se pudo cargar el listado de tickets activos' })
  }

  if (tickets.length === 0) {
    return { ok: true, count: 0, failed: 0 }
  }

  // 4) Procesar en paralelo la descarga y el envío de correos
  let sentCount = 0
  let failCount = 0

  const sendPromises = tickets.map(async (ticket: any) => {
    try {
      if (!ticket.pdf_path || !ticket.attendees?.email) {
        failCount++
        return
      }

      // Descargar PDF del almacenamiento
      const { data: fileData, error: downloadErr } = await db.storage
        .from('tickets')
        .download(ticket.pdf_path)

      if (downloadErr || !fileData) {
        failCount++
        return
      }

      const arrayBuffer = await fileData.arrayBuffer()
      const pdfBuffer = Buffer.from(arrayBuffer)

      // Formatear fecha del evento
      const eventDate = new Date(ticket.events.event_at).toLocaleDateString('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Bogota'
      })

      // Enviar correo individual
      const sent = await sendEmail({
        to: ticket.attendees.email,
        subject: `Tu entrada para ${ticket.events.name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #4f46e5; margin-bottom: 20px;">¡Hola ${ticket.attendees.full_name}!</h2>
            <p>Aquí tienes tu entrada para el evento <strong>${ticket.events.name}</strong>.</p>
            
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #f1f5f9;">
              <p style="margin: 5px 0;"><strong>Evento:</strong> ${ticket.events.name}</p>
              <p style="margin: 5px 0;"><strong>Fecha:</strong> ${eventDate}</p>
              <p style="margin: 5px 0;"><strong>Lugar:</strong> ${ticket.events.venue}</p>
              <p style="margin: 5px 0;"><strong>Tipo de Entrada:</strong> ${ticket.ticket_tiers.name}</p>
            </div>

            <p>Adjunto a este correo encontrarás tu ticket de ingreso en formato PDF con el código QR de acceso.</p>
            <p>Por favor, asegúrate de presentarlo en la entrada del evento.</p>
            
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #64748b; text-align: center;">Este es un correo automático de confirmación de Vita Felix.</p>
          </div>
        `,
        attachments: [
          {
            filename: `ticket_${ticket.id.substring(0, 8)}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      })

      if (sent) {
        sentCount++
      } else {
        failCount++
      }
    } catch (err) {
      failCount++
      console.error(`Error al procesar envío masivo para ticket ${ticket.id}:`, err)
    }
  })

  await Promise.all(sendPromises)

  return {
    ok: true,
    count: sentCount,
    failed: failCount
  }
})
