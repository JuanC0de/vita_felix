import type { AppRole } from './types/auth'

export interface NavItem {
  label: string
  to: string
  roles: AppRole[]
}

export interface NavGroup {
  groupName: string
  items: NavItem[]
}

const ALL_ROLES: AppRole[] = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER', 'GATE_STAFF']

export default defineAppConfig({
  app: {
    name: 'Vita Felix',
  },
  // Navegación declarativa agrupada por secciones y filtrable por rol.
  navGroups: [
    {
      groupName: 'GENERAL',
      items: [
        { label: 'Dashboard Global', to: '/admin/dashboard', roles: ['SUPER_ADMIN'] },
        { label: 'Dashboard Empresa', to: '/dashboard', roles: ['COMPANY_ADMIN'] },
        { label: 'Empresas', to: '/admin/companies', roles: ['SUPER_ADMIN'] },
        { label: 'Usuarios', to: '/admin/users', roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'] },
        { label: 'Eventos', to: '/events', roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER'] },
        { label: 'Auditoría de Pagos', to: '/admin/soporte/pagos', roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'] },
      ]
    },
    {
      groupName: 'OPERACIÓN',
      items: [
        { label: 'Control de acceso QR', to: '/scan', roles: ['SUPER_ADMIN', 'GATE_STAFF', 'COMPANY_ADMIN', 'EVENT_MANAGER'] },
      ]
    }
  ] as NavGroup[],
})
