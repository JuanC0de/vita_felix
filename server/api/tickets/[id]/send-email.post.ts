import { createError, getRouterParam } from 'h3'
import { requireRole } from '../../../utils/auth'
import { serviceRoleClient } from '../../../utils/supabase'
import { sendEmail } from '../../../utils/email'

/**
 * POST /api/tickets/[id]/send-email
 * Reenvía manualmente el ticket de ingreso por correo electrónico.
 * Solo accesible para SUPER_ADMIN, COMPANY_ADMIN o EVENT_MANAGER.
 */
export default defineEventHandler(async (event) => {
  const ctx = await requireRole(event, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER'])
  const id = getRouterParam(event, 'id') as string

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Falta el identificador de ticket' })
  }

  const db = serviceRoleClient(event)

  // 1) Obtener detalles del ticket, asistente, evento y tipo de ticket
  const { data: ticket, error: tErr } = await db
    .from('tickets')
    .select('*, attendees(full_name, email), events(name, event_at, venue), ticket_tiers(name)')
    .eq('id', id)
    .maybeSingle()

  if (tErr || !ticket) {
    throw createError({ statusCode: 404, statusMessage: 'Ticket no encontrado' })
  }

  // 2) Validar pertenencia del ticket a la empresa del usuario si no es SUPER_ADMIN
  if (ctx.role !== 'SUPER_ADMIN' && ctx.companyId !== ticket.company_id) {
    throw createError({ statusCode: 403, statusMessage: 'Acceso denegado' })
  }

  // 3) Validar que el ticket no esté anulado
  if (ticket.status === 'void') {
    throw createError({ statusCode: 422, statusMessage: 'No se puede enviar un ticket que ha sido anulado' })
  }

  // 4) Validar que exista la ruta del PDF
  if (!ticket.pdf_path) {
    throw createError({ statusCode: 404, statusMessage: 'El ticket no tiene un archivo PDF generado asociado' })
  }

  // 5) Descargar el PDF desde Supabase Storage
  const { data: fileData, error: downloadErr } = await db.storage
    .from('tickets')
    .download(ticket.pdf_path)

  if (downloadErr || !fileData) {
    throw createError({ statusCode: 500, statusMessage: 'No se pudo descargar el archivo del ticket desde el almacenamiento' })
  }

  // 6) Convertir el Blob de respuesta en un Buffer para enviarlo por correo
  const arrayBuffer = await fileData.arrayBuffer()
  const pdfBuffer = Buffer.from(arrayBuffer)

  // 7) Formatear la fecha para el correo
  const eventDate = new Date(ticket.events.event_at).toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  // 8) Enviar el correo con el ticket adjunto
  const emailSent = await sendEmail({
    to: ticket.attendees.email,
    subject: `Tu entrada para ${ticket.events.name} (Reenvío)`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5; margin-bottom: 20px;">¡Hola ${ticket.attendees.full_name}!</h2>
        <p>Te reenviamos tu entrada para el evento <strong>${ticket.events.name}</strong> a solicitud del organizador.</p>
        
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
        filename: `ticket_${id.substring(0, 8)}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  })

  if (!emailSent) {
    throw createError({ statusCode: 500, statusMessage: 'No se pudo despachar el correo electrónico' })
  }

  return { ok: true }
})
