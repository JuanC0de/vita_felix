import { describe, expect, it } from 'vitest'
import { randomBytes } from 'node:crypto'
import { decryptCedula, encryptCedula, hashCedula } from './attendee-crypto'

const KEY = randomBytes(32)

describe('attendee-crypto: cifrado de la cédula', () => {
  it('round-trip encrypt → decrypt recupera el valor', () => {
    const enc = encryptCedula('1234567890', KEY)
    expect(decryptCedula(enc, KEY)).toBe('1234567890')
  })

  it('el valor cifrado no contiene la cédula en claro', () => {
    const enc = encryptCedula('1234567890', KEY)
    expect(enc).not.toContain('1234567890')
  })

  it('cifrados sucesivos de la misma cédula difieren (IV aleatorio)', () => {
    expect(encryptCedula('1234567890', KEY)).not.toBe(encryptCedula('1234567890', KEY))
  })

  it('falla al descifrar con clave distinta', () => {
    const enc = encryptCedula('1234567890', KEY)
    expect(() => decryptCedula(enc, randomBytes(32))).toThrow()
  })
})

describe('attendee-crypto: hash determinista para dedup', () => {
  it('la misma cédula produce el mismo hash', () => {
    expect(hashCedula('1234567890', KEY)).toBe(hashCedula('1234567890', KEY))
  })

  it('normaliza espacios alrededor', () => {
    expect(hashCedula(' 1234567890 ', KEY)).toBe(hashCedula('1234567890', KEY))
  })

  it('cédulas distintas producen hashes distintos', () => {
    expect(hashCedula('1234567890', KEY)).not.toBe(hashCedula('0987654321', KEY))
  })

  it('el hash no revela la cédula', () => {
    expect(hashCedula('1234567890', KEY)).not.toContain('1234567890')
  })
})
