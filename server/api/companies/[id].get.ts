import { createError } from 'h3'
import { requireRole } from '../../utils/auth'
import { serviceRoleClient } from '../../utils/supabase'

/**
 * GET /api/companies/[id]
 * Retorna los detalles de una empresa específica.
 * Solo accesible para SUPER_ADMIN (o COMPANY_ADMIN de la misma empresa).
 */
export default defineEventHandler(async (event) => {
  const ctx = await requireRole(event, ['SUPER_ADMIN', 'COMPANY_ADMIN'])
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Falta el identificador de empresa' })
  }

  // Si es COMPANY_ADMIN, validar que sea su propia empresa
  if (ctx.role === 'COMPANY_ADMIN' && ctx.companyId !== id) {
    throw createError({ statusCode: 403, statusMessage: 'Acceso denegado' })
  }

  const db = serviceRoleClient(event)
  const { data: company, error } = await db
    .from('companies')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !company) {
    throw createError({ statusCode: 404, statusMessage: 'Empresa no encontrada' })
  }

  return company
})
