import { createHash } from 'crypto'

/**
 * Calcula la firma de integridad SHA-256 para una transacción de Wompi.
 * Requerida para cobros en COP.
 * @param reference Referencia única de la transacción.
 * @param amountInCents Monto total en centavos de COP.
 * @param currency Moneda ('COP').
 * @param integritySecret Secreto de integridad de la empresa obtenido de Wompi.
 */
export function generateWompiSignature(
  reference: string,
  amountInCents: number,
  currency: string,
  integritySecret: string
): string {
  const rawString = `${reference}${amountInCents}${currency}${integritySecret}`
  return createHash('sha256').update(rawString).digest('hex')
}

/**
 * Valida la autenticidad del checksum enviado por Wompi en la notificación del webhook.
 * @param payload Objeto body JSON recibido de la notificación de Wompi.
 * @param eventsSecret Secreto de eventos de la empresa obtenido de Wompi.
 */
export function isValidWebhookSignature(
  payload: any,
  eventsSecret: string
): boolean {
  if (!payload?.signature?.properties || !payload?.signature?.checksum) {
    return false
  }

  const properties = payload.signature.properties as string[]
  const checksum = payload.signature.checksum as string

  // Extraer valores correspondientes en base a la ruta de la propiedad
  const values = properties.map((propPath) => {
    if (propPath === 'transaction.id') return payload.data?.transaction?.id ?? ''
    if (propPath === 'transaction.status') return payload.data?.transaction?.status ?? ''
    if (propPath === 'transaction.amount_in_cents') return payload.data?.transaction?.amount_in_cents ?? ''
    if (propPath === 'timestamp') return payload.timestamp ?? ''
    return ''
  })

  // Concatenar valores en orden + secreto de eventos
  const rawString = `${values.join('')}${eventsSecret}`
  const computedChecksum = createHash('sha256').update(rawString).digest('hex')

  return computedChecksum === checksum
}
