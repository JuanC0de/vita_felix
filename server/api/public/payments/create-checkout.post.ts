import { createError, readBody } from 'h3'
import { serviceRoleClient } from '../../../utils/supabase'
import { generateWompiSignature } from '../../../utils/wompi'
import { getTicketingSecrets } from '../../../utils/ticketing-config'
import { hashCedula } from '../../../utils/attendee-crypto'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CEDULA_RE = /^[0-9-]{5,20}$/

interface CheckoutItem {
  tierId: string
  quantity: number
}

interface CheckoutAttendee {
  tierId: string
  fullName: string
  email: string
  cedula: string
}

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as {
    eventId?: unknown
    items?: unknown
    attendees?: unknown
  }

  const eventId = typeof body?.eventId === 'string' ? body.eventId.trim() : ''
  if (!eventId || !UUID_RE.test(eventId)) {
    throw createError({ statusCode: 400, statusMessage: 'Identificador de evento inválido.' })
  }

  const items = Array.isArray(body?.items) ? (body.items as CheckoutItem[]) : []
  const attendees = Array.isArray(body?.attendees) ? (body.attendees as CheckoutAttendee[]) : []

  if (items.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Debes seleccionar al menos una entrada.' })
  }
  if (attendees.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Debes ingresar los datos de los asistentes.' })
  }

  // 1) Validar consistencia de cantidades y asistentes
  const tierQuantities: Record<string, number> = {}
  for (const item of items) {
    if (!item.tierId || !UUID_RE.test(item.tierId) || typeof item.quantity !== 'number' || item.quantity <= 0) {
      throw createError({ statusCode: 422, statusMessage: 'Estructura de entradas seleccionadas inválida.' })
    }
    tierQuantities[item.tierId] = (tierQuantities[item.tierId] || 0) + item.quantity
  }

  const attendeeCounts: Record<string, number> = {}
  const validationErrors: string[] = []

  // Validar datos de cada asistente
  for (let i = 0; i < attendees.length; i++) {
    const att = attendees[i]
    if (!att) continue
    const indexStr = `Asistente #${i + 1}`

    if (!att.tierId || !UUID_RE.test(att.tierId)) {
      validationErrors.push(`${indexStr}: Etapa de boletería inválida.`)
    }
    if (!att.fullName || typeof att.fullName !== 'string' || att.fullName.trim().length === 0) {
      validationErrors.push(`${indexStr}: El nombre completo es obligatorio.`)
    }
    if (!att.email || typeof att.email !== 'string' || !EMAIL_RE.test(att.email.trim())) {
      validationErrors.push(`${indexStr}: El correo electrónico es inválido.`)
    }
    if (!att.cedula || typeof att.cedula !== 'string' || !CEDULA_RE.test(att.cedula.trim())) {
      validationErrors.push(`${indexStr}: La cédula debe contener entre 5 y 20 dígitos.`)
    }

    if (att.tierId) {
      attendeeCounts[att.tierId] = (attendeeCounts[att.tierId] || 0) + 1
    }
  }

  if (validationErrors.length > 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Datos de asistentes inválidos',
      data: { errors: validationErrors },
    })
  }

  // Validar que la cantidad de asistentes ingresados coincida con las entradas seleccionadas
  for (const tierId of Object.keys(tierQuantities)) {
    const qtySelected = tierQuantities[tierId]
    const qtyAttendees = attendeeCounts[tierId] || 0
    if (qtySelected !== qtyAttendees) {
      throw createError({
        statusCode: 422,
        statusMessage: `La cantidad de asistentes para la etapa seleccionada no coincide con las entradas compradas.`,
      })
    }
  }

  const db = serviceRoleClient(event)
  const { encKey } = getTicketingSecrets()

  // 2) Consultar evento y credenciales de Wompi de la empresa asociada
  const { data: eventData, error: evError } = await db
    .from('events')
    .select(`
      id,
      name,
      status,
      company_id,
      companies (
        id,
        wompi_enabled,
        wompi_public_key,
        wompi_integrity_secret
      )
    `)
    .eq('id', eventId)
    .maybeSingle()

  if (evError || !eventData) {
    throw createError({ statusCode: 404, statusMessage: 'El evento no existe.' })
  }

  const eventRow = eventData as any
  if (eventRow.status !== 'published') {
    throw createError({ statusCode: 400, statusMessage: 'El evento no está disponible para venta en línea.' })
  }

  const company = eventRow.companies
  if (!company || !company.wompi_enabled) {
    throw createError({
      statusCode: 400,
      statusMessage: 'La empresa organizadora no tiene habilitada la pasarela de pagos Wompi.',
    })
  }

  // 3) Consultar y validar tiers del evento, calculando precios y verificando cupos
  const { data: tiersData, error: tiersError } = await db
    .from('ticket_tiers')
    .select('id, name, price, quota, currency')
    .eq('event_id', eventId)
    .eq('kind', 'sale')

  if (tiersError || !tiersData) {
    throw createError({ statusCode: 500, statusMessage: 'No se pudieron consultar las etapas de boletería.' })
  }

  const eventTiers = tiersData as Array<{ id: string; name: string; price: number; quota: number; currency: string }>
  let totalAmount = 0
  const cleanAttendeesData: Array<{ tierId: string; fullName: string; email: string; cedula: string }> = []

  for (const item of items) {
    const tier = eventTiers.find((t) => t.id === item.tierId)
    if (!tier) {
      throw createError({ statusCode: 422, statusMessage: 'Una de las etapas de boletería seleccionadas no pertenece al evento.' })
    }

    // Verificar cupo disponible del tier de forma atómica/consolidada
    const { count, error: countError } = await db
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .eq('tier_id', item.tierId)
      .neq('status', 'void')

    if (countError) {
      throw createError({ statusCode: 500, statusMessage: 'Error al verificar disponibilidad de cupos.' })
    }

    const soldCount = count || 0
    if (soldCount + item.quantity > tier.quota) {
      throw createError({
        statusCode: 422,
        statusMessage: `Cupo insuficiente para la etapa "${tier.name}". Disponibles: ${tier.quota - soldCount}.`,
      })
    }

    // Sumar al monto total
    totalAmount += Number(tier.price) * item.quantity
  }

  // 4) Mapear los datos de asistentes
  for (const att of attendees) {
    cleanAttendeesData.push({
      tierId: att.tierId,
      fullName: att.fullName.trim(),
      email: att.email.trim().toLowerCase(),
      cedula: att.cedula.trim(),
    })
  }

  // 5) Verificar restricción única de cédula por evento (req. 1.4) de manera preventiva
  for (const att of cleanAttendeesData) {
    const cedHash = hashCedula(att.cedula, encKey)
    const { data: existingAttendee } = await db
      .from('attendees')
      .select('id')
      .eq('event_id', eventId)
      .eq('cedula_hash', cedHash)
      .maybeSingle()

    if (existingAttendee) {
      throw createError({
        statusCode: 409,
        statusMessage: `La cédula "${att.cedula}" ya está registrada para este evento. Cada asistente requiere una identificación única.`,
      })
    }
  }

  const amountInCents = Math.round(totalAmount * 100)
  const currency = 'COP'
  const reference = `VTFX-${Date.now()}-${crypto.randomUUID().substring(0, 8)}`

  // URL de confirmación propia de la aplicación. Se puede fijar con
  // NUXT_PUBLIC_SITE_URL (útil en desarrollo con un túnel público).
  const configuredSiteUrl = useRuntimeConfig(event).public.siteUrl as string | undefined
  const headers = getRequestHeaders(event)
  const host = headers.host || 'localhost:3000'
  const protocol = headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https')
  const origin = (configuredSiteUrl || `${protocol}://${host}`).replace(/\/$/, '')
  const confirmUrl = `${origin}/e/${eventId}/confirm-payment?reference=${reference}`

  // Wompi responde 403 al abrir el checkout si redirect-url apunta a un host
  // no público (localhost / 127.0.0.1), lo que deja el widget en blanco. En ese
  // caso se omite el parámetro: el widget entrega el resultado por callback y
  // el cliente navega a confirmUrl por su cuenta.
  const isPublicOrigin = !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(origin)
  const redirectUrl = isPublicOrigin ? confirmUrl : null

  if (amountInCents === 0) {
    // Si el registro es gratuito, se aprueba la transacción e inician los tickets inmediatamente
    const { data: transaction, error: txError } = await db
      .from('payment_transactions')
      .insert({
        company_id: eventRow.company_id,
        event_id: eventId,
        reference,
        amount_in_cents: 0,
        currency,
        status: 'approved',
        attendees_data: cleanAttendeesData,
      })
      .select('id')
      .single()

    if (txError || !transaction) {
      throw createError({ statusCode: 500, statusMessage: 'No se pudo procesar el registro gratuito.' })
    }

    const { issueTicketsForTransaction } = await import('../../../utils/tickets-repo')
    await issueTicketsForTransaction(event, transaction.id)

    return {
      reference,
      amountInCents: 0,
      currency,
      wompiPublicKey: '',
      signature: '',
      redirectUrl,
      confirmUrl,
    }
  }

  // 6) Crear la transacción en la base de datos (estado pending)
  const { data: transaction, error: txError } = await db
    .from('payment_transactions')
    .insert({
      company_id: eventRow.company_id,
      event_id: eventId,
      reference,
      amount_in_cents: amountInCents,
      currency,
      status: 'pending',
      attendees_data: cleanAttendeesData,
    })
    .select('id')
    .single()

  if (txError || !transaction) {
    throw createError({ statusCode: 500, statusMessage: 'No se pudo crear la transacción de pago.' })
  }

  // 7) Calcular firma de integridad de Wompi
  const signature = generateWompiSignature(
    reference,
    amountInCents,
    currency,
    company.wompi_integrity_secret
  )

  return {
    reference,
    amountInCents,
    currency,
    wompiPublicKey: company.wompi_public_key,
    signature,
    redirectUrl,
    confirmUrl,
  }
})

