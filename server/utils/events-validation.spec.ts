import { describe, expect, it } from 'vitest'
import { validateEventInput, validateTierInput } from './events-validation'

function errorFields(result: ReturnType<typeof validateEventInput>): string[] {
  return result.ok ? [] : result.errors.map((e) => e.field)
}

describe('validateEventInput', () => {
  it('acepta un evento válido y sanea los campos', () => {
    const result = validateEventInput({
      name: '  Concierto  ',
      venue: '  Movistar Arena ',
      eventAt: '2026-09-01T20:00:00.000Z',
      description: '  noche de rock  ',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.name).toBe('Concierto')
      expect(result.value.venue).toBe('Movistar Arena')
      expect(result.value.description).toBe('noche de rock')
      expect(result.value.eventAt).toBe('2026-09-01T20:00:00.000Z')
    }
  })

  it('normaliza descripción vacía/ausente a null', () => {
    const result = validateEventInput({ name: 'X', venue: 'Y', eventAt: '2026-01-01T00:00:00Z' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.description).toBeNull()
  })

  it('rechaza nombre, lugar y fecha faltantes o inválidos', () => {
    const result = validateEventInput({ name: '   ', venue: '', eventAt: 'no-es-fecha' })
    expect(result.ok).toBe(false)
    expect(errorFields(result)).toEqual(expect.arrayContaining(['name', 'venue', 'eventAt']))
  })

  it('rechaza descripción no textual', () => {
    const result = validateEventInput({ name: 'X', venue: 'Y', eventAt: '2026-01-01T00:00:00Z', description: 123 })
    expect(result.ok).toBe(false)
    expect(errorFields(result)).toContain('description')
  })

  it('acepta flyerUrl válido y lo sanea', () => {
    const result = validateEventInput({
      name: 'Evento',
      venue: 'Lugar',
      eventAt: '2026-01-01T00:00:00Z',
      flyerUrl: '  https://example.com/flyer.jpg  '
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.flyerUrl).toBe('https://example.com/flyer.jpg')
    }
  })

  it('normaliza flyerUrl ausente o vacío a null', () => {
    const resultNormal = validateEventInput({
      name: 'Evento',
      venue: 'Lugar',
      eventAt: '2026-01-01T00:00:00Z',
      flyerUrl: '   '
    })
    expect(resultNormal.ok).toBe(true)
    if (resultNormal.ok) {
      expect(resultNormal.value.flyerUrl).toBeNull()
    }
  })

  it('rechaza flyerUrl no textual', () => {
    const result = validateEventInput({
      name: 'Evento',
      venue: 'Lugar',
      eventAt: '2026-01-01T00:00:00Z',
      flyerUrl: 999
    })
    expect(result.ok).toBe(false)
    expect(errorFields(result)).toContain('flyerUrl')
  })
})


describe('validateTierInput', () => {
  it('acepta un tier válido', () => {
    const result = validateTierInput({ name: 'VIP', price: 120000, currency: 'COP', quota: 50 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toEqual({ name: 'VIP', price: 120000, currency: 'COP', quota: 50, entryTimeLimit: null, surchargeAmount: 0 })
    }
  })

  it('acepta un tier con límite de tiempo y recargo válidos', () => {
    const result = validateTierInput({ name: 'Early Bird', price: 50000, currency: 'COP', quota: 100, entryTimeLimit: '22:30', surchargeAmount: 15000 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.entryTimeLimit).toBe('22:30')
      expect(result.value.surchargeAmount).toBe(15000)
    }
  })

  it('rechaza límite de tiempo con formato inválido', () => {
    const result = validateTierInput({ name: 'VIP', price: 10000, currency: 'COP', quota: 10, entryTimeLimit: 'tarde' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.map((e) => e.field)).toContain('entryTimeLimit')
  })

  it('rechaza recargo negativo', () => {
    const result = validateTierInput({ name: 'VIP', price: 10000, currency: 'COP', quota: 10, surchargeAmount: -5000 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.map((e) => e.field)).toContain('surchargeAmount')
  })

  it('acepta precio cero (gratis)', () => {
    const result = validateTierInput({ name: 'Free', price: 0, currency: 'USD', quota: 0 })
    expect(result.ok).toBe(true)
  })

  it('rechaza precio negativo', () => {
    const result = validateTierInput({ name: 'X', price: -1, currency: 'COP', quota: 10 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.map((e) => e.field)).toContain('price')
  })

  it('rechaza cupo negativo y no entero', () => {
    expect(validateTierInput({ name: 'X', price: 1, currency: 'COP', quota: -5 }).ok).toBe(false)
    expect(validateTierInput({ name: 'X', price: 1, currency: 'COP', quota: 1.5 }).ok).toBe(false)
  })

  it('rechaza moneda inválida', () => {
    expect(validateTierInput({ name: 'X', price: 1, currency: 'cop', quota: 1 }).ok).toBe(false)
    expect(validateTierInput({ name: 'X', price: 1, currency: 'PESOS', quota: 1 }).ok).toBe(false)
  })

  it('rechaza nombre vacío', () => {
    const result = validateTierInput({ name: '  ', price: 1, currency: 'COP', quota: 1 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.map((e) => e.field)).toContain('name')
  })
})
