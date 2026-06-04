import { describe, expect, it } from 'vitest'
import { validateRegistrationInput } from './ticketing-validation'

const VALID = {
  tierId: '11111111-1111-1111-1111-111111111111',
  fullName: 'Ada Lovelace',
  cedula: '1234567890',
  email: 'ada@example.com',
}

describe('ticketing-validation: registro', () => {
  it('acepta un payload válido y lo sanea', () => {
    const res = validateRegistrationInput({ ...VALID, email: 'ADA@Example.com', fullName: '  Ada  ' })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.value.email).toBe('ada@example.com')
      expect(res.value.fullName).toBe('Ada')
    }
  })

  it('rechaza tierId no-UUID', () => {
    const res = validateRegistrationInput({ ...VALID, tierId: 'abc' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errors.some((e) => e.field === 'tierId')).toBe(true)
  })

  it('rechaza nombre vacío', () => {
    const res = validateRegistrationInput({ ...VALID, fullName: '   ' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errors.some((e) => e.field === 'fullName')).toBe(true)
  })

  it('rechaza cédula con letras o demasiado corta', () => {
    expect(validateRegistrationInput({ ...VALID, cedula: 'abc' }).ok).toBe(false)
    expect(validateRegistrationInput({ ...VALID, cedula: '12' }).ok).toBe(false)
  })

  it('rechaza correo inválido', () => {
    const res = validateRegistrationInput({ ...VALID, email: 'no-es-correo' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errors.some((e) => e.field === 'email')).toBe(true)
  })

  it('acumula múltiples errores', () => {
    const res = validateRegistrationInput({})
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errors.length).toBeGreaterThanOrEqual(4)
  })
})
