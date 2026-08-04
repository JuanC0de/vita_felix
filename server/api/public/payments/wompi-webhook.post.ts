import { createError, readBody } from 'h3'
import { serviceRoleClient } from '../../../utils/supabase'
import { isValidWebhookSignature } from '../../../utils/wompi'
import { issueTicketsForTransaction } from '../../../utils/tickets-repo'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body || !body.data || !body.data.transaction) {
    throw createError({ statusCode: 400, statusMessage: 'Payload de webhook inválido.' })
  }

  const transactionData = body.data.transaction
  const reference = transactionData.reference
  const wompiStatus = transactionData.status
  const wompiId = transactionData.id

  if (!reference) {
    throw createError({ statusCode: 400, statusMessage: 'Falta la referencia de la transacción.' })
  }

  const db = serviceRoleClient(event)

  // 1) Obtener la transacción y los secretos de Wompi de la empresa
  const { data: tx, error: txError } = await db
    .from('payment_transactions')
    .select(`
      id,
      status,
      company_id,
      event_id,
      companies (
        wompi_events_secret
      )
    `)
    .eq('reference', reference)
    .maybeSingle()

  if (txError || !tx) {
    throw createError({ statusCode: 404, statusMessage: 'Transacción no encontrada en el sistema.' })
  }

  const company = (tx as any).companies
  if (!company || !company.wompi_events_secret) {
    throw createError({ statusCode: 500, statusMessage: 'Configuración de eventos de Wompi incompleta.' })
  }

  // 2) Validar la firma digital del Webhook
  const isSignatureValid = isValidWebhookSignature(body, company.wompi_events_secret)
  if (!isSignatureValid) {
    throw createError({ statusCode: 401, statusMessage: 'Firma de webhook inválida.' })
  }

  // 3) Evitar reprocesar si la transacción ya está aprobada (idempotencia)
  if (tx.status === 'approved') {
    return { success: true, message: 'La transacción ya había sido procesada previamente.' }
  }

  // 4) Procesar según el estado recibido de Wompi
  if (wompiStatus === 'APPROVED') {
    try {
      // Registrar el ID de Wompi en la transacción antes de emitir para trazabilidad
      await db
        .from('payment_transactions')
        .update({ wompi_id: wompiId })
        .eq('id', tx.id)

      // Emitir boletas, generar PDFs, subir a storage y enviar correos
      await issueTicketsForTransaction(event, tx.id)

      return { success: true, message: 'Boletas emitidas y enviadas con éxito.' }
    } catch (err: any) {
      console.error('Error al emitir boletas desde webhook de Wompi:', err)
      // Guardar el estado de error en la transacción
      await db
        .from('payment_transactions')
        .update({ status: 'error', updated_at: new Date().toISOString() })
        .eq('id', tx.id)

      throw createError({
        statusCode: 500,
        statusMessage: `Error al procesar la emisión de boletas: ${err.message || 'Error desconocido'}`,
      })
    }
  } else {
    // Si la transacción fue rechazada, anulada o dio error
    const newStatus =
      wompiStatus === 'DECLINED' ? 'declined' :
      wompiStatus === 'VOIDED' ? 'voided' : 'error'

    const { error: updateError } = await db
      .from('payment_transactions')
      .update({
        status: newStatus,
        wompi_id: wompiId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tx.id)

    if (updateError) {
      throw createError({ statusCode: 500, statusMessage: 'No se pudo actualizar el estado de la transacción.' })
    }

    return { success: true, message: `Transacción actualizada a estado: ${newStatus}` }
  }
})
