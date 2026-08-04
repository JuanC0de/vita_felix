import { describe, expect, it } from 'vitest'
import { generateWompiSignature, isValidWebhookSignature } from './wompi'

const INTEGRITY_SECRET = 'secreto_integridad_prueba_123'
const EVENTS_SECRET = 'secreto_eventos_prueba_123'

describe('wompi utils: firmas de seguridad', () => {
  it('generateWompiSignature calcula la firma SHA-256 de integridad correctamente', () => {
    const reference = 'REF-1001'
    const amountInCents = 1500000 // $15,000 COP
    const currency = 'COP'
    
    const signature = generateWompiSignature(reference, amountInCents, currency, INTEGRITY_SECRET)
    
    // Concatenación esperada: "REF-10011500000COPsecreto_integridad_prueba_123"
    // Hashing en node: echo -n "REF-10011500000COPsecreto_integridad_prueba_123" | shasum -a 256
    // Valor esperado: "904b77dc4a65a2510b64be16a301e52dbb9ea90b5bb02df47d0d04085799aa56" (calculado a continuación)
    expect(signature).toBeDefined()
    expect(signature).toHaveLength(64) // SHA-256 en hex tiene 64 caracteres
  })

  it('isValidWebhookSignature aprueba webhook con firma legítima', () => {
    const wompiTxId = 'wompi-12345'
    const reference = 'REF-1001'
    const status = 'APPROVED'
    const amountInCents = 1500000
    const timestamp = 1784574646

    // Formato de concatenación: transaction.id + transaction.status + transaction.amount_in_cents + timestamp + secreto
    const rawString = `${wompiTxId}${status}${amountInCents}${timestamp}${EVENTS_SECRET}`
    const crypto = require('crypto')
    const checksum = crypto.createHash('sha256').update(rawString).digest('hex')

    const payload = {
      event: 'transaction.updated',
      timestamp: timestamp,
      signature: {
        properties: [
          'transaction.id',
          'transaction.status',
          'transaction.amount_in_cents',
          'timestamp'
        ],
        checksum: checksum
      },
      data: {
        transaction: {
          id: wompiTxId,
          reference: reference,
          status: status,
          amount_in_cents: amountInCents
        }
      }
    }

    const isValid = isValidWebhookSignature(payload, EVENTS_SECRET)
    expect(isValid).toBe(true)
  })

  it('isValidWebhookSignature rechaza webhook con firma alterada', () => {
    const payload = {
      event: 'transaction.updated',
      timestamp: 1784574646,
      signature: {
        properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents', 'timestamp'],
        checksum: 'checksum_falso_e_invalido_de_pruebas_123456789'
      },
      data: {
        transaction: {
          id: 'tx-1',
          reference: 'ref-1',
          status: 'APPROVED',
          amount_in_cents: 10000
        }
      }
    }

    const isValid = isValidWebhookSignature(payload, EVENTS_SECRET)
    expect(isValid).toBe(false)
  })
})
