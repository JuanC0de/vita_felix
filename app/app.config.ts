import type { AppRole } from './types/auth'

/** Elemento de navegación del Dashboard, visible solo para ciertos roles. */
export interface NavItem {
  label: string
  to: string
  roles: AppRole[]
}

const ALL_ROLES: AppRole[] = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER', 'GATE_STAFF']

export default defineAppConfig({
  app: {
    name: 'Vita Felix',
  },
  // Navegación declarativa filtrable por rol. Las especificaciones aguas abajo
  // (event-management, ticketing-checkin) añaden sus propias entradas aquí.
  nav: [
    { label: 'Dashboard', to: '/', roles: ALL_ROLES },
  ] as NavItem[],
})
