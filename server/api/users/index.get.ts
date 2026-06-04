import { requireRole } from '../../utils/auth'
import { serviceRoleClient } from '../../utils/supabase'

/**
 * GET /api/users
 * Retorna el listado de usuarios enriquecido con correos y membresías de empresas.
 * - SUPER_ADMIN ve todos los usuarios.
 * - COMPANY_ADMIN ve únicamente los usuarios de su propia empresa.
 */
export default defineEventHandler(async (event) => {
  const ctx = await requireRole(event, ['SUPER_ADMIN', 'COMPANY_ADMIN'])
  const db = serviceRoleClient(event)

  // 1) Obtener perfiles filtrados por empresa
  let query = db.from('profiles').select('*')
  
  if (ctx.role === 'COMPANY_ADMIN') {
    query = query.eq('company_id', ctx.companyId!)
  }

  const { data: profiles, error } = await query
  if (error || !profiles) return []

  // 2) Enriquecer perfiles con el email de auth.users y membresías de user_companies
  const enrichedUsers = await Promise.all(
    profiles.map(async (p) => {
      // Obtener email de auth
      const { data: authUser } = await (db as any)
        .schema('auth')
        .from('users')
        .select('email')
        .eq('id', p.id)
        .maybeSingle()

      // Obtener todas las empresas a las que pertenece el usuario
      const { data: memberships } = await db
        .from('user_companies')
        .select('company_id, role, status, companies(name)')
        .eq('user_id', p.id)

      const companiesList = (memberships ?? []).map((m: any) => ({
        companyId: m.company_id,
        role: m.role,
        status: m.status,
        companyName: m.companies?.name || 'Desconocida',
      }))

      return {
        id: p.id,
        fullName: p.full_name,
        role: p.role,
        companyId: p.company_id,
        createdAt: p.created_at,
        email: authUser?.email || '',
        companies: companiesList,
      }
    })
  )

  return enrichedUsers
})
