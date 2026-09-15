/**
 * Regenera los PDF de las cortesías afectadas por el bug del fallback de etapa.
 *
 * Antes de la migración 0024, una invitación emitida por un anfitrión sin etapa
 * asignada caía en la primera etapa del evento (p. ej. PREVENTA) y su PDF quedó
 * rotulado como una venta. La migración ya reubicó esos tickets en la etapa de
 * cortesía; este script vuelve a generar el PDF con el rótulo correcto.
 *
 * El QR NO cambia: se firma sobre el id del ticket, que se conserva. Las boletas
 * ya descargadas siguen siendo válidas en portería.
 *
 * Uso:
 *   npx tsx scripts/backfill-courtesy-tickets.ts --dry-run
 *   npx tsx scripts/backfill-courtesy-tickets.ts
 *   npx tsx scripts/backfill-courtesy-tickets.ts --event <uuid>
 *   npx tsx scripts/backfill-courtesy-tickets.ts --event <uuid> --resend
 *
 * --resend reenvía además el correo con la boleta corregida. Úsalo solo para
 * eventos que todavía no han ocurrido: para los pasados el PDF regenerado en
 * Storage es suficiente y evita escribirle a cientos de invitados.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { signToken } from '../server/utils/qr-token'
import { generateTicketPdf } from '../server/utils/ticket-pdf'
import { sendEmail } from '../server/utils/email'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Carga mínima de .env: solo pares KEY=VALUE, sin dependencias extra.
// Un valor entrecomillado se desenvuelve y se le deshacen los escapes, igual que
// hace dotenv: NUXT_EMAIL_FROM guarda comillas escapadas y un remitente
// malformado hace fallar el envío SMTP en silencio.
for (const line of readFileSync(resolve(root, '.env'), 'utf-8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (!m) continue
  const [, key, raw] = m
  if (process.env[key] !== undefined) continue
  let value = raw.trim()
  if (value.startsWith('"') && value.endsWith('"') && value.length > 1) {
    value = value.slice(1, -1).replace(/\\(["\\])/g, '$1')
  }
  process.env[key] = value
}

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY
const qrSecret = process.env.NUXT_QR_JWT_SECRET
const graceHours = Number(process.env.NUXT_QR_GRACE_HOURS ?? 12)

if (!url || !serviceKey || !qrSecret) {
  console.error('Faltan SUPABASE_URL, SUPABASE_SECRET_KEY o NUXT_QR_JWT_SECRET en .env')
  process.exit(1)
}

const dryRun = process.argv.includes('--dry-run')
const resend = process.argv.includes('--resend')
const eventArgIndex = process.argv.indexOf('--event')
const onlyEventId = eventArgIndex >= 0 ? process.argv[eventArgIndex + 1] : null

if (resend && !onlyEventId) {
  console.error('--resend exige --event <uuid>: no se reenvía masivamente a toda la plataforma.')
  process.exit(1)
}

// sendEmail cae a un modo de simulación por consola cuando no hay transporte,
// y devuelve true igual. Sin esta guarda el script informaría envíos que nunca
// salieron.
if (resend && !dryRun && !process.env.NUXT_RESEND_API_KEY && !process.env.RESEND_API_KEY && !process.env.NUXT_SMTP_HOST) {
  console.error('--resend pero no hay RESEND_API_KEY ni NUXT_SMTP_HOST: los correos solo se simularían.')
  process.exit(1)
}

const db = createClient(url, serviceKey)
const BUCKET = 'tickets'

async function main() {
  let query = db
    .from('tickets')
    .select(
      'id, event_id, pdf_path, is_courtesy, ' +
        'ticket_tiers(name, kind, entry_time_limit), ' +
        'attendees(full_name, email, host_id, event_hosts(name)), ' +
        'events(name, venue, event_at, flyer_url, theme_config, companies(name))',
    )
    .eq('is_courtesy', true)
    .neq('status', 'void')

  if (onlyEventId) query = query.eq('event_id', onlyEventId)

  const { data, error } = await query
  if (error) {
    console.error('No se pudieron listar las cortesías:', error.message)
    process.exit(1)
  }

  const tickets = (data ?? []) as any[]
  console.log(`Cortesías encontradas: ${tickets.length}${dryRun ? ' (simulación)' : ''}`)

  let regenerated = 0
  let resentCount = 0
  for (const t of tickets) {
    const ev = t.events
    const tier = t.ticket_tiers
    const att = t.attendees
    if (!ev || !tier || !att) {
      console.warn(`  · ${t.id}: datos incompletos, se omite`)
      continue
    }

    const hostName = att.event_hosts?.name ?? null
    console.log(`  · ${t.id} — ${att.full_name} — etapa "${tier.name}" (${tier.kind})`)
    if (dryRun) continue

    const eventEpoch = Math.floor(new Date(ev.event_at).getTime() / 1000)
    const qrToken = signToken({ sub: t.id, exp: eventEpoch + graceHours * 3600 }, qrSecret!)

    const pdfBytes = await generateTicketPdf({
      qrToken,
      eventName: ev.name,
      venue: ev.venue,
      eventAt: ev.event_at,
      tierName: tier.name,
      attendeeName: att.full_name,
      ticketId: t.id,
      flyerUrl: ev.flyer_url,
      themeConfig: ev.theme_config,
      organizerName: ev.companies?.name ?? null,
      isSpecialGuest: true,
      hostName,
      entryTimeLimit: tier.entry_time_limit ?? null,
    })

    const pdfPath = t.pdf_path || `${t.id}.pdf`
    const { error: upErr } = await db.storage
      .from(BUCKET)
      .upload(pdfPath, Buffer.from(pdfBytes), { contentType: 'application/pdf', upsert: true })

    if (upErr) {
      console.error(`    ✗ no se pudo subir el PDF: ${upErr.message}`)
      continue
    }

    if (!t.pdf_path) {
      await db.from('tickets').update({ pdf_path: pdfPath }).eq('id', t.id)
    }
    regenerated++

    if (!resend) continue

    const fecha = new Date(ev.event_at).toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Bogota',
    })
    const saludoHost = hostName ? ` de parte de <strong>${hostName}</strong>` : ''

    const sent = await sendEmail({
      to: att.email,
      subject: `Tu cortesía actualizada para ${ev.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #6d28d9; margin-bottom: 20px;">¡Hola ${att.full_name}!</h2>
          <p>Te reenviamos tu invitación de cortesía${saludoHost} para <strong>${ev.name}</strong> con la boleta actualizada.</p>
          <p>La versión anterior aparecía con el nombre de una etapa de venta. Es la misma invitación gratuita de siempre y <strong>tu código QR no ha cambiado</strong>: si ya descargaste la boleta, sigue siendo válida.</p>

          <div style="background-color: #faf5ff; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #f3e8ff;">
            <p style="margin: 5px 0;"><strong>Evento:</strong> ${ev.name}</p>
            <p style="margin: 5px 0;"><strong>Fecha:</strong> ${fecha}</p>
            <p style="margin: 5px 0;"><strong>Lugar:</strong> ${ev.venue}</p>
            <p style="margin: 5px 0;"><strong>Tipo de Entrada:</strong> ${tier.name}</p>
          </div>

          <p>Preséntala en la entrada del evento.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b; text-align: center;">Este es un correo automático de Vita Felix.</p>
        </div>
      `,
      attachments: [
        {
          filename: `cortesia_${t.id.substring(0, 8)}.pdf`,
          content: Buffer.from(pdfBytes),
          contentType: 'application/pdf',
        },
      ],
    })
    if (sent) resentCount++
  }

  console.log(dryRun ? 'Simulación terminada.' : `PDF regenerados: ${regenerated}`)
  if (resend && !dryRun) console.log(`Correos reenviados: ${resentCount}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
