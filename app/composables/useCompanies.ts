/**
 * Composable de gestión de empresas (capa de cliente, Super Admin).
 */
export function useCompanies() {
  function list(): Promise<any[]> {
    return $fetch<any[]>('/api/companies')
  }

  function get(id: string): Promise<any> {
    return $fetch<any>(`/api/companies/${id}`)
  }

  function create(payload: any): Promise<any> {
    return $fetch<any>('/api/companies', { method: 'POST', body: payload })
  }

  function update(id: string, payload: any): Promise<any> {
    return $fetch<any>(`/api/companies/${id}`, { method: 'PUT', body: payload })
  }

  return { list, get, create, update }
}
