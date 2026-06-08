import { describe, expect, it, vi } from 'vitest'

// Mockear el alias de Nuxt imports
vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({
    // Retornar las variables esperadas por ticketing-config.ts
    ticketing: {
      qrSecret: 'test-qr-secret-of-sufficient-length-1234',
      encKey: 'test-enc-key-of-sufficient-length-1234',
      graceHours: 24,
    },
  }),
}))

import * as supabaseModule from './supabase'
import { createHost, listHosts, getInvitationStatus } from './event-hosts-repo'

// Mockear clientes de Supabase
vi.mock('./supabase', () => {
  const mockSingle = vi.fn()
  const mockSelect = vi.fn()
  const mockInsert = vi.fn()
  const mockEq = vi.fn()
  const mockOrder = vi.fn()
  const mockMaybeSingle = vi.fn()

  const dbMock: any = {
    from: vi.fn(() => dbMock),
    select: mockSelect,
    insert: mockInsert,
    eq: mockEq,
    order: mockOrder,
    maybeSingle: mockMaybeSingle,
    single: mockSingle,
  }

  // Encadenamiento fluido
  mockSelect.mockReturnValue(dbMock)
  mockInsert.mockReturnValue(dbMock)
  mockEq.mockReturnValue(dbMock)
  mockOrder.mockReturnValue(dbMock)
  mockMaybeSingle.mockReturnValue(dbMock)
  mockSingle.mockReturnValue(dbMock)

  return {
    userClient: vi.fn(async () => dbMock),
    serviceRoleClient: vi.fn(() => dbMock),
    _mockSingle: mockSingle,
    _mockSelect: mockSelect,
    _mockInsert: mockInsert,
    _mockEq: mockEq,
    _mockOrder: mockOrder,
    _mockMaybeSingle: mockMaybeSingle,
    _dbMock: dbMock,
  }
})

describe('event-hosts-repo: gestión de anfitriones', () => {
  it('crea un anfitrión correctamente y devuelve el modelo mapeado', async () => {
    const { _mockSingle, _mockInsert } = supabaseModule as any

    // Simulaciones
    _mockSingle.mockResolvedValueOnce({
      data: { company_id: 'company-123' },
      error: null,
    })

    _mockSingle.mockResolvedValueOnce({
      data: {
        id: 'host-123',
        company_id: 'company-123',
        event_id: 'event-123',
        tier_id: 'tier-123',
        name: 'DJ Armin',
        role: 'DJ',
        max_guests: 5,
        token: 'token-abc',
        created_at: '2026-06-08T15:00:00Z',
      },
      error: null,
    })

    const res = await createHost({} as any, 'event-123', {
      name: 'DJ Armin',
      role: 'DJ',
      maxGuests: 5,
      tierId: 'tier-123',
    })

    expect(res).toEqual({
      id: 'host-123',
      companyId: 'company-123',
      eventId: 'event-123',
      tierId: 'tier-123',
      name: 'DJ Armin',
      role: 'DJ',
      maxGuests: 5,
      token: 'token-abc',
      createdAt: '2026-06-08T15:00:00Z',
      guestsRegisteredCount: 0,
    })
  })

  it('lista los anfitriones del evento con sus contadores de invitados', async () => {
    const { _mockOrder } = supabaseModule as any

    _mockOrder.mockResolvedValueOnce({
      data: [
        {
          id: 'host-123',
          company_id: 'company-123',
          event_id: 'event-123',
          tier_id: null,
          name: 'Socio VIP',
          role: 'PARTNER',
          max_guests: 10,
          token: 'token-vip',
          created_at: '2026-06-08T15:00:00Z',
          attendees: [{ id: 'guest-1' }, { id: 'guest-2' }],
        },
      ],
      error: null,
    })

    const res = await listHosts({} as any, 'event-123')
    expect(res).toHaveLength(1)
    expect(res[0]?.guestsRegisteredCount).toBe(2)
    expect(res[0]?.name).toBe('Socio VIP')
  })

  it('retorna estado no válido si el token no existe', async () => {
    const { _mockMaybeSingle } = supabaseModule as any

    _mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    const res = await getInvitationStatus({} as any, 'event-123', 'token-invalido')
    expect(res.valid).toBe(false)
  })
})
