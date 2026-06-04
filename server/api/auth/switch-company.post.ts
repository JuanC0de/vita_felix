import { createError, readBody } from 'h3'
import { requireUser } from '../../utils/auth'
import { serviceRoleClient } from '../../utils/supabase'
import type { AppRole } from '~/types/auth'

/**
 * POST /api/auth/switch-company
 * Cambia la empresa y el rol activos de un usuario en su perfil.
 * Si el usuario es SUPER_ADMIN, puede cambiar a cualquier empresa o volver al acceso global.
 * Si es un usuario normal, debe pertenecer a la empresa indicada en la tabla user_companies.
 * Body: { companyId: string | null }
 */
export default defineEventHandler(async (event) => {
  const ctx = await requireUser(event)
  const body = (await readBody(event)) as { companyId?: unknown }
  const companyId = typeof body?.companyId === 'string' ? body.companyId : null

  const db = serviceRoleClient(event)

  let targetRole: AppRole
  
  if (ctx.role === 'SUPER_ADMIN') {
    // SUPER_ADMIN puede cambiar a cualquier empresa o regresar a global (null)
    if (!companyId) {
      targetRole = 'SUPER_ADMIN'
    } else {
      // Verificar si la empresa existe
      const { data: co, error: coErr } = await db
        .from('companies')
        .select('id')
        .eq('id', companyId)
        .maybeSingle()
      if (coErr || !co) {
        throw createError({ statusCode: 404, statusMessage: 'Empresa no encontrada' })
      }
      targetRole = 'SUPER_ADMIN' // SUPER_ADMIN conserva su rol pero cambia el ámbito de la empresa
    }
  } else {
    // Usuario no SUPER_ADMIN requiere una membresía válida
    if (!companyId) {
      throw createError({ statusCode: 400, statusMessage: 'Se requiere un identificador de empresa' })
    }

    const { data: membership, error: mErr } = await db
      .from('user_companies')
      .select('role')
      .eq('user_id', ctx.userId)
      .eq('company_id', companyId)
      .eq('status', 'active')
      .maybeSingle()

    if (mErr || !membership) {
      throw createError({ statusCode: 403, statusMessage: 'No perteneces a esta empresa o está inactiva' })
    }

    targetRole = membership.role as AppRole
  }

  // Actualizar el perfil activo en profiles (bypasseando RLS con serviceRoleClient)
  const { error: upErr } = await db
    .from('profiles')
    .update({
      company_id: companyId,
      role: targetRole,
    })
    .eq('id', ctx.userId)

  if (upErr) {
    throw createError({ statusCode: 500, statusMessage: 'No se pudo cambiar de empresa activa' })
  }

  return { ok: true, companyId, role: targetRole }
})
