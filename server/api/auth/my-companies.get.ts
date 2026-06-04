import { requireUser } from '../../utils/auth'
import { serviceRoleClient } from '../../utils/supabase'

/**
 * GET /api/auth/my-companies
 * Retorna las empresas a las que el usuario tiene acceso.
 * - Si es SUPER_ADMIN, retorna todas las empresas de la plataforma.
 * - Si es otro rol, retorna solo las empresas asociadas al usuario en user_companies.
 */
export default defineEventHandler(async (event) => {
  const ctx = await requireUser(event)
  const db = serviceRoleClient(event)

  if (ctx.role === 'SUPER_ADMIN') {
    // Retornar todas las empresas para SUPER_ADMIN
    const { data, error } = await db
      .from('companies')
      .select('id, name, slug')
      .order('name')
    if (error) return []
    return data
  } else {
    // Retornar solo las empresas en user_companies para este usuario
    const { data, error } = await db
      .from('user_companies')
      .select('company_id, companies(id, name, slug)')
      .eq('user_id', ctx.userId)
      .eq('status', 'active')

    if (error || !data) return []

    // Mapear y filtrar posibles nulos
    return data
      .map((row: any) => row.companies)
      .filter((c: any) => c != null)
  }
})
