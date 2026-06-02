import { describe, expect, it } from 'vitest'
import { buildAuthContext, canAccess, filterByRole, isAuthorized } from './authz'
import type { AppRole } from '../types/auth'

describe('buildAuthContext', () => {
  it('devuelve null sin usuario', () => {
    expect(buildAuthContext(null)).toBeNull()
  })

  it('mapea un usuario habilitado con empresa y rol (req. 3.2)', () => {
    const ctx = buildAuthContext({
      id: 'u1',
      email: 'a@x.com',
      app_metadata: { company_id: 'c1', role: 'COMPANY_ADMIN' },
    })
    expect(ctx).toEqual({
      userId: 'u1',
      email: 'a@x.com',
      companyId: 'c1',
      role: 'COMPANY_ADMIN',
      status: 'active',
    })
  })

  it('mapea SUPER_ADMIN con companyId null (acceso transversal)', () => {
    const ctx = buildAuthContext({
      id: 'sa',
      email: 's@x.com',
      app_metadata: { company_id: null, role: 'SUPER_ADMIN' },
    })
    expect(ctx?.role).toBe('SUPER_ADMIN')
    expect(ctx?.companyId).toBeNull()
    expect(ctx?.status).toBe('active')
  })

  it('marca disabled cuando no hay claim de rol (req. 4.4)', () => {
    const ctx = buildAuthContext({ id: 'u2', email: 'b@x.com', app_metadata: {} })
    expect(ctx?.status).toBe('disabled')
    expect(ctx?.role).toBeNull()
    expect(ctx?.companyId).toBeNull()
  })

  it('marca disabled cuando el rol no es reconocido', () => {
    const ctx = buildAuthContext({
      id: 'u3',
      email: 'c@x.com',
      app_metadata: { role: 'HACKER', company_id: 'c1' },
    })
    expect(ctx?.status).toBe('disabled')
    expect(ctx?.role).toBeNull()
  })
})

describe('canAccess', () => {
  it('permite cuando el rol está en la lista', () => {
    expect(canAccess('EVENT_MANAGER', ['EVENT_MANAGER', 'COMPANY_ADMIN'])).toBe(true)
  })
  it('niega cuando el rol no está en la lista', () => {
    expect(canAccess('GATE_STAFF', ['COMPANY_ADMIN'])).toBe(false)
  })
  it('niega cuando el rol es null o undefined', () => {
    expect(canAccess(null, ['SUPER_ADMIN'])).toBe(false)
    expect(canAccess(undefined, ['SUPER_ADMIN'])).toBe(false)
  })
})

describe('isAuthorized (matriz de roles, req. 3.3/3.4/7.1)', () => {
  const roles: AppRole[] = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER', 'GATE_STAFF']
  const allowed: AppRole[] = ['COMPANY_ADMIN', 'EVENT_MANAGER']

  it.each(roles)('rol %s contra [COMPANY_ADMIN, EVENT_MANAGER]', (role) => {
    const ctx = buildAuthContext({ id: 'u', email: 'e@x.com', app_metadata: { role, company_id: 'c1' } })
    expect(isAuthorized(ctx, allowed)).toBe(allowed.includes(role))
  })

  it('niega a cuentas no habilitadas aunque la lista incluya su (no) rol', () => {
    const disabled = buildAuthContext({ id: 'u', email: 'e@x.com', app_metadata: {} })
    expect(isAuthorized(disabled, roles)).toBe(false)
  })

  it('niega cuando no hay contexto', () => {
    expect(isAuthorized(null, roles)).toBe(false)
  })
})

describe('filterByRole (navegación por rol, req. 6.2)', () => {
  const nav = [
    { label: 'Dashboard', to: '/', roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER', 'GATE_STAFF'] as AppRole[] },
    { label: 'Empresas', to: '/companies', roles: ['SUPER_ADMIN'] as AppRole[] },
  ]

  it('GATE_STAFF solo ve las entradas permitidas', () => {
    expect(filterByRole(nav, 'GATE_STAFF').map((n) => n.to)).toEqual(['/'])
  })
  it('SUPER_ADMIN ve todas', () => {
    expect(filterByRole(nav, 'SUPER_ADMIN').map((n) => n.to)).toEqual(['/', '/companies'])
  })
  it('sin rol no ve nada', () => {
    expect(filterByRole(nav, null)).toEqual([])
  })
})
