import { createError, readBody } from 'h3'
import { requireRole } from '../../utils/auth'
import { serviceRoleClient } from '../../utils/supabase'

// Función helper para generar slug
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/\s+/g, '-') // Cambiar espacios por guiones
    .replace(/[^\w\-]+/g, '') // Quitar caracteres no válidos
    .replace(/\-\-+/g, '-') // Quitar guiones duplicados
    .replace(/^-+/, '') // Quitar guiones iniciales
    .replace(/-+$/, '') // Quitar guiones finales
}

/**
 * POST /api/companies
 * Crea una nueva empresa organizadora en el sistema.
 * Solo accesible para SUPER_ADMIN.
 */
export default defineEventHandler(async (event) => {
  await requireRole(event, ['SUPER_ADMIN'])
  const body = await readBody(event)

  if (!body.name?.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'El nombre comercial es obligatorio' })
  }

  const db = serviceRoleClient(event)
  const slug = slugify(body.name)

  // Validar unicidad del slug
  const { data: existing } = await db
    .from('companies')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Ya existe una empresa con ese nombre o slug' })
  }

  const { data: company, error } = await db
    .from('companies')
    .insert({
      name: body.name.trim(),
      slug,
      legal_name: body.legalName?.trim() || null,
      document_number: body.documentNumber?.trim() || null,
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      city: body.city?.trim() || null,
      country: body.country?.trim() || 'Colombia',
      logo_url: body.logoUrl?.trim() || null,
      plan: body.plan || 'free',
      status: body.status || 'active',
      max_events: body.maxEvents ? Number(body.maxEvents) : 3,
      max_users: body.maxUsers ? Number(body.maxUsers) : 3,
      commission_percentage: body.commissionPercentage ? Number(body.commissionPercentage) : 0,
    })
    .select()
    .single()

  if (error || !company) {
    throw createError({ statusCode: 500, statusMessage: 'No se pudo crear la empresa organizadora' })
  }

  return company
})
