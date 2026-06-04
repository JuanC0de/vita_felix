import { createError, getRouterParam, readBody } from 'h3'
import { requireRole } from '../../../utils/auth'
import { registerAndIssue } from '../../../utils/tickets-repo'
import { validateRegistrationInput } from '../../../utils/ticketing-validation'
import { serviceRoleClient } from '../../../utils/supabase'

/**
 * POST /api/events/[id]/attendees
 * Emisión manual de entradas por parte de administradores corporativos.
 * Solo accesible para SUPER_ADMIN, COMPANY_ADMIN o EVENT_MANAGER de la empresa.
 * Retorna el ticket emitido y la URL firmada del PDF.
 */
export default defineEventHandler(async (event) => {
  const ctx = await requireRole(event, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER'])
  const id = getRouterParam(event, 'id') as string

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Falta el identificador de evento' })
  }

  const body = await readBody(event)
  const result = validateRegistrationInput(body)
  
  if (!result.ok) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Datos de registro manual inválidos',
      data: { errors: result.errors },
    })
  }

  // 1) Validar pertenencia del evento a la empresa del usuario si no es SUPER_ADMIN
  const db = serviceRoleClient(event)
  const { data: ev } = await db
    .from('events')
    .select('company_id, status')
    .eq('id', id)
    .maybeSingle()

  if (!ev) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado' })
  }

  if (ctx.role !== 'SUPER_ADMIN' && ctx.companyId !== ev.company_id) {
    throw createError({ statusCode: 403, statusMessage: 'Acceso denegado' })
  }

  // 2) Forzar de forma temporal el estado a 'published' para el registro manual si estuviera en borrador
  // Esto permite a los organizadores emitir cortesías de prueba en borradores.
  const originalStatus = ev.status
  if (originalStatus !== 'published') {
    await db.from('events').update({ status: 'published' }).eq('id', id)
  }

  try {
    const res = await registerAndIssue(event, id, result.value)
    return { ok: true, ...res }
  } finally {
    // 3) Restaurar estado original si fue modificado temporalmente
    if (originalStatus !== 'published') {
      await db.from('events').update({ status: originalStatus }).eq('id', id)
    }
  }
})
