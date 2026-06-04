/**
 * Composable de gestión de usuarios (capa de cliente, Super Admin y Company Admin).
 */
export function useUsers() {
  function list(): Promise<any[]> {
    return $fetch<any[]>('/api/users')
  }

  function invite(payload: any): Promise<any> {
    return $fetch<any>('/api/users/invite', { method: 'POST', body: payload })
  }

  function update(id: string, companyId: string, payload: any): Promise<any> {
    return $fetch<any>(`/api/users/${id}`, {
      method: 'PUT',
      body: { ...payload, companyId }
    })
  }

  return { list, invite, update }
}
