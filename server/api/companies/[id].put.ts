import { createError, readBody } from 'h3'
import { requireRole } from '../../utils/auth'
import { serviceRoleClient } from '../../utils/supabase'

/**
 * PUT /api/companies/[id]
 * Actualiza los detalles de una empresa específica.
 * - SUPER_ADMIN puede actualizar todos los campos.
 * - COMPANY_ADMIN puede actualizar solo campos de contacto e informativos de su propia empresa.
 */
export default defineEventHandler(async (event) => {
  const ctx = await requireRole(event, ['SUPER_ADMIN', 'COMPANY_ADMIN'])
  const id = event.context.params?.id
  const body = await readBody(event)

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Falta el identificador de empresa' })
  }

  // Si es COMPANY_ADMIN, validar que sea su propia empresa
  if (ctx.role === 'COMPANY_ADMIN' && ctx.companyId !== id) {
    throw createError({ statusCode: 403, statusMessage: 'Acceso denegado' })
  }

  const db = serviceRoleClient(event)

  // Filtrar campos modificables según el rol
  const updateData: Record<string, any> = {
    name: body.name?.trim(),
    legal_name: body.legalName?.trim() || null,
    document_number: body.documentNumber?.trim() || null,
    email: body.email?.trim() || null,
    phone: body.phone?.trim() || null,
    city: body.city?.trim() || null,
    country: body.country?.trim() || 'Colombia',
    logo_url: body.logoUrl?.trim() || null,
  }

  // Solo SUPER_ADMIN puede alterar planes, estado y comisiones
  if (ctx.role === 'SUPER_ADMIN') {
    if (body.plan) updateData.plan = body.plan
    if (body.status) updateData.status = body.status
    if (body.maxEvents !== undefined) updateData.max_events = Number(body.maxEvents)
    if (body.maxUsers !== undefined) updateData.max_users = Number(body.maxUsers)
    if (body.commissionPercentage !== undefined) updateData.commission_percentage = Number(body.commissionPercentage)
  }

  if (!updateData.name) {
    throw createError({ statusCode: 422, statusMessage: 'El nombre comercial es obligatorio' })
  }

  const { data: company, error } = await db
    .from('companies')
    .update(updateData as any)
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error || !company) {
    throw createError({ statusCode: 500, statusMessage: 'No se pudo actualizar la empresa' })
  }

  return company
})
