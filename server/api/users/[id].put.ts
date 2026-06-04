import { createError, readBody } from 'h3'
import { requireRole } from '../../utils/auth'
import { serviceRoleClient } from '../../utils/supabase'

/**
 * PUT /api/users/[id]
 * Actualiza el rol o estado de un usuario en una empresa.
 * - SUPER_ADMIN puede actualizar cualquier usuario en cualquier empresa.
 * - COMPANY_ADMIN puede actualizar solo usuarios dentro de su propia empresa.
 */
export default defineEventHandler(async (event) => {
  const ctx = await requireRole(event, ['SUPER_ADMIN', 'COMPANY_ADMIN'])
  const id = event.context.params?.id
  const body = await readBody(event)

  const companyId = typeof body?.companyId === 'string' ? body.companyId : null
  const role = typeof body?.role === 'string' ? body.role : null
  const status = typeof body?.status === 'string' ? body.status : null

  if (!id || !companyId) {
    throw createError({ statusCode: 400, statusMessage: 'Identificadores de usuario y empresa obligatorios' })
  }

  // Si es COMPANY_ADMIN, validar que coincida con su propia empresa
  if (ctx.role === 'COMPANY_ADMIN' && ctx.companyId !== companyId) {
    throw createError({ statusCode: 403, statusMessage: 'No tienes permisos para editar este usuario' })
  }

  const db = serviceRoleClient(event)

  // 1) Actualizar membresía en user_companies
  const updateData: Record<string, any> = {}
  if (role) updateData.role = role
  if (status) updateData.status = status

  const { data: membership, error: memErr } = await db
    .from('user_companies')
    .update(updateData as any)
    .eq('user_id', id)
    .eq('company_id', companyId)
    .select()
    .maybeSingle()

  if (memErr || !membership) {
    throw createError({ statusCode: 500, statusMessage: 'No se pudo actualizar la membresía del usuario' })
  }

  // 2) Si la empresa modificada es la empresa activa del usuario en profiles, sincronizar el rol
  const { data: profile } = await db
    .from('profiles')
    .select('company_id')
    .eq('id', id)
    .maybeSingle()

  if (profile && profile.company_id === companyId) {
    const profUpdate: Record<string, any> = {}
    if (role) profUpdate.role = role
    
    // Si la membresía está suspendida, podemos forzar un rol desactivado o nulo en profiles
    if (status === 'suspended') {
      // Invalida su rol activo para deshabilitarlo
      profUpdate.role = null
    }

    await db
      .from('profiles')
      .update(profUpdate as any)
      .eq('id', id)
  }

  return { ok: true, membership }
})
