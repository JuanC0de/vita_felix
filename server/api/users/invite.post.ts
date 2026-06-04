import { createError, readBody } from 'h3'
import { requireRole } from '../../utils/auth'
import { serviceRoleClient } from '../../utils/supabase'

/**
 * POST /api/users/invite
 * Registra un nuevo usuario en la base de datos de autenticación de Supabase,
 * inicializa su perfil administrativo y crea su afiliación (user_companies).
 * Solo accesible para SUPER_ADMIN o COMPANY_ADMIN.
 */
export default defineEventHandler(async (event) => {
  const ctx = await requireRole(event, ['SUPER_ADMIN', 'COMPANY_ADMIN'])
  const body = await readBody(event)

  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : ''
  const role = typeof body?.role === 'string' ? body.role : ''
  const targetCompanyId = typeof body?.companyId === 'string' ? body.companyId : null

  if (!email || !password || !fullName || !role) {
    throw createError({ statusCode: 422, statusMessage: 'Todos los campos son obligatorios' })
  }

  // Si es COMPANY_ADMIN, validar que coincida con su propia empresa
  if (ctx.role === 'COMPANY_ADMIN' && ctx.companyId !== targetCompanyId) {
    throw createError({ statusCode: 403, statusMessage: 'No tienes permisos para agregar usuarios a otra empresa' })
  }

  const db = serviceRoleClient(event)

  // 1) Crear el usuario en auth.users usando el API de Administración
  const { data: authUser, error: authErr } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  })

  if (authErr || !authUser.user) {
    throw createError({
      statusCode: 400,
      statusMessage: authErr?.message || 'No se pudo crear el usuario de autenticación'
    })
  }

  const userId = authUser.user.id

  // 2) Crear el perfil en profiles
  const { data: profile, error: profErr } = await db
    .from('profiles')
    .insert({
      id: userId,
      company_id: targetCompanyId,
      role: role as any,
      full_name: fullName,
    })
    .select()
    .single()

  if (profErr) {
    // Intentar revertir la creación del usuario en auth
    await db.auth.admin.deleteUser(userId)
    throw createError({ statusCode: 500, statusMessage: 'No se pudo crear el perfil de usuario' })
  }

  // 3) Crear membresía en user_companies (si pertenece a una empresa)
  if (targetCompanyId) {
    const { error: memErr } = await db
      .from('user_companies')
      .insert({
        user_id: userId,
        company_id: targetCompanyId,
        role: role as any,
        status: 'active',
      })

    if (memErr) {
      // Revertir perfil y usuario
      await db.from('profiles').delete().eq('id', userId)
      await db.auth.admin.deleteUser(userId)
      throw createError({ statusCode: 500, statusMessage: 'No se pudo registrar la membresía en la empresa' })
    }
  }

  return { ok: true, userId, email, fullName }
})
