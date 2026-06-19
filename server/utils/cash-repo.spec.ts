import { describe, expect, it, vi } from 'vitest'

// Mockear el alias de Nuxt imports
vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({
    ticketing: {
      qrSecret: 'test-qr-secret-of-sufficient-length-1234',
      encKey: 'test-enc-key-of-sufficient-length-1234',
      graceHours: 24
    }
  })
}))

import * as supabaseModule from './supabase'
import { getActiveSession, openSession, closeSession } from './cash-repo'

// Mockear clientes de Supabase
vi.mock('./supabase', () => {
  const mockSingle = vi.fn()
  const mockSelect = vi.fn()
  const mockInsert = vi.fn()
  const mockUpdate = vi.fn()
  const mockEq = vi.fn()
  const mockMaybeSingle = vi.fn()

  const dbMock: any = {
    from: vi.fn(() => dbMock),
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    eq: mockEq,
    maybeSingle: mockMaybeSingle,
    single: mockSingle
  }

  // Encadenamiento fluido
  mockSelect.mockReturnValue(dbMock)
  mockInsert.mockReturnValue(dbMock)
  mockUpdate.mockReturnValue(dbMock)
  mockEq.mockReturnValue(dbMock)
  mockMaybeSingle.mockReturnValue(dbMock)
  mockSingle.mockReturnValue(dbMock)

  return {
    userClient: vi.fn(() => dbMock),
    serviceRoleClient: vi.fn(() => dbMock),
    _mockSingle: mockSingle,
    _mockSelect: mockSelect,
    _mockInsert: mockInsert,
    _mockUpdate: mockUpdate,
    _mockEq: mockEq,
    _mockMaybeSingle: mockMaybeSingle,
    _dbMock: dbMock
  }
})

describe('cash-repo: turnos y control de cajas', () => {
  it('obtiene la sesión de caja activa de forma exitosa', async () => {
    const { _mockMaybeSingle } = supabaseModule as any

    _mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: 'session-123',
        company_id: 'company-123',
        event_id: 'event-123',
        user_id: 'user-123',
        opened_at: '2026-06-19T12:00:00Z',
        closed_at: null,
        opening_balance: 50000,
        closing_balance_expected: null,
        closing_balance_real: null,
        status: 'open'
      },
      error: null
    })

    const res = await getActiveSession({} as any, 'user-123', 'event-123')
    expect(res).not.toBeNull()
    expect(res?.id).toBe('session-123')
    expect(res?.openingBalance).toBe(50000)
    expect(res?.status).toBe('open')
  })

  it('abre una nueva sesión de caja y la retorna', async () => {
    const { _mockSingle, _mockMaybeSingle } = supabaseModule as any

    // Simulamos que no hay sesión activa
    _mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })

    // Simulamos la inserción exitosa
    _mockSingle.mockResolvedValueOnce({
      data: {
        id: 'session-999',
        company_id: 'company-123',
        event_id: 'event-123',
        user_id: 'user-123',
        opened_at: '2026-06-19T13:00:00Z',
        closed_at: null,
        opening_balance: 30000,
        closing_balance_expected: null,
        closing_balance_real: null,
        status: 'open'
      },
      error: null
    })

    const res = await openSession({} as any, 'user-123', 'event-123', 'company-123', 30000)
    expect(res.id).toBe('session-999')
    expect(res.openingBalance).toBe(30000)
    expect(res.status).toBe('open')
  })

  it('cierra la sesión de caja computando arqueo y descuadre', async () => {
    const { _mockMaybeSingle, _mockSingle } = supabaseModule as any

    // 1) Retorno de la sesión a cerrar
    _mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: 'session-123',
        company_id: 'company-123',
        event_id: 'event-123',
        opening_balance: 10000,
        status: 'open'
      },
      error: null
    })

    // 2) Retorno de la suma de ventas en puerta (door_sales) asociadas en efectivo
    _mockMaybeSingle.mockResolvedValueOnce({
      data: [{ amount: 5000 }, { amount: 2000 }],
      error: null
    })

    // 3) Retorno de la actualización de cierre
    _mockSingle.mockResolvedValueOnce({
      data: {
        id: 'session-123',
        company_id: 'company-123',
        event_id: 'event-123',
        user_id: 'user-123',
        opened_at: '2026-06-19T12:00:00Z',
        closed_at: '2026-06-19T18:00:00Z',
        opening_balance: 10000,
        closing_balance_expected: 17000, // 10000 + 7000 ventas
        closing_balance_real: 17000,     // Reportado exacto
        status: 'closed'
      },
      error: null
    })

    // Ejecutamos cierre con saldo real de 17000 (cero descuadre)
    const res = await closeSession({} as any, 'session-123', 17000)
    expect(res.status).toBe('closed')
    expect(res.closingBalanceExpected).toBe(17000)
    expect(res.closingBalanceReal).toBe(17000)
  })
})
