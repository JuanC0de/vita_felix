import { randomUUID } from 'node:crypto'
import { createError, getRouterParam, readMultipartFormData } from 'h3'
import { requireRole } from '../../../utils/auth'
import { serviceRoleClient } from '../../../utils/supabase'

/**
 * POST /api/events/[id]/flyer
 * Carga el archivo del flyer promocional en el almacenamiento seguro de Supabase.
 * Valida tamaño, formato y los permisos del organizador.
 */
export default defineEventHandler(async (event) => {
  const ctx = await requireRole(event, ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER'])
  const id = getRouterParam(event, 'id') as string

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Falta el identificador de evento' })
  }

  // 1) Validar pertenencia del evento a la empresa del usuario
  const db = serviceRoleClient(event)
  const { data: ev } = await db
    .from('events')
    .select('company_id')
    .eq('id', id)
    .maybeSingle()

  if (!ev) {
    throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado' })
  }

  if (ctx.role !== 'SUPER_ADMIN' && ctx.companyId !== ev.company_id) {
    throw createError({ statusCode: 403, statusMessage: 'Acceso denegado' })
  }

  // 2) Procesar datos multiparte de la peticion
  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No se recibió ningún archivo' })
  }

  // Buscar el archivo en los datos multiparte
  const file = formData.find((part) => part.name === 'file' && part.filename)
  if (!file) {
    throw createError({ statusCode: 400, statusMessage: 'Archivo faltante en el campo file' })
  }

  // 3) Validar tipo de contenido y tamano (limite de 5 MB)
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  if (!file.type || !allowedTypes.includes(file.type)) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Formato de imagen inválido. Solo se admiten archivos JPG, PNG, WEBP o GIF.',
    })
  }

  const maxBytes = 5 * 1024 * 1024
  if (file.data.length > maxBytes) {
    throw createError({
      statusCode: 422,
      statusMessage: 'El archivo excede el tamaño límite permitido de 5 MB.',
    })
  }

  // 4) Subir archivo al bucket de flyers
  const filename = file.filename ?? 'image.jpg'
  const extension = filename.split('.').pop() ?? 'jpg'
  const filePath = `events/${id}/${randomUUID()}.${extension}`

  const { error: uploadError } = await db.storage
    .from('flyers')
    .upload(filePath, file.data, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error al almacenar el archivo en Supabase Storage.',
    })
  }

  // 5) Obtener y retornar la URL publica
  const { data: publicUrlData } = db.storage
    .from('flyers')
    .getPublicUrl(filePath)

  return {
    flyerUrl: publicUrlData.publicUrl,
  }
})
