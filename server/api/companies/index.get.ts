import { requireRole } from '../../utils/auth'
import { serviceRoleClient } from '../../utils/supabase'

/**
 * GET /api/companies
 * Retorna la lista completa de empresas con información de aforos y estadísticas.
 * Solo accesible para SUPER_ADMIN.
 */
export default defineEventHandler(async (event) => {
  await requireRole(event, ['SUPER_ADMIN'])
  const db = serviceRoleClient(event)

  // Consultar empresas
  const { data: companies, error } = await db
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !companies) return []

  // Para cada empresa, calcular total de eventos y usuarios asociados
  const enrichedCompanies = await Promise.all(
    companies.map(async (co) => {
      // Eventos de la empresa
      const { count: eventCount } = await db
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', co.id)

      // Usuarios de la empresa
      const { count: userCount } = await db
        .from('user_companies')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', co.id)

      return {
        ...co,
        eventCount: eventCount || 0,
        userCount: userCount || 0,
      }
    })
  )

  return enrichedCompanies
})
