import type { EventWriteModel, TierWriteModel } from '../../app/types/events'

/** Error de validación asociado a un campo concreto. */
export interface FieldError {
  field: string
  message: string
}

/** Resultado de validación: o un modelo saneado, o la lista de errores. */
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: FieldError[] }

function asRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Valida el payload de un evento. Reglas (req. 3.2, 3.3):
 *   - name: cadena no vacía
 *   - venue: cadena no vacía
 *   - eventAt: fecha/hora válida (ISO 8601 parseable)
 *   - description: opcional (cadena o nulo)
 */
export function validateEventInput(input: unknown): ValidationResult<EventWriteModel> {
  const data = asRecord(input)
  const errors: FieldError[] = []

  if (!isNonEmptyString(data.name)) {
    errors.push({ field: 'name', message: 'El nombre es obligatorio.' })
  }
  if (!isNonEmptyString(data.venue)) {
    errors.push({ field: 'venue', message: 'El lugar es obligatorio.' })
  }
  if (!isNonEmptyString(data.eventAt) || Number.isNaN(Date.parse(data.eventAt as string))) {
    errors.push({ field: 'eventAt', message: 'La fecha y hora del evento son inválidas.' })
  }
  if (
    data.description !== undefined &&
    data.description !== null &&
    typeof data.description !== 'string'
  ) {
    errors.push({ field: 'description', message: 'La descripción debe ser texto.' })
  }
  if (
    data.flyerUrl !== undefined &&
    data.flyerUrl !== null &&
    typeof data.flyerUrl !== 'string'
  ) {
    errors.push({ field: 'flyerUrl', message: 'El enlace del flyer debe ser texto.' })
  }

  if (errors.length > 0) return { ok: false, errors }

  return {
    ok: true,
    value: {
      name: (data.name as string).trim(),
      venue: (data.venue as string).trim(),
      eventAt: new Date(data.eventAt as string).toISOString(),
      description: isNonEmptyString(data.description) ? (data.description as string).trim() : null,
      flyerUrl: isNonEmptyString(data.flyerUrl) ? (data.flyerUrl as string).trim() : null,
    },
  }
}

/**
 * Valida el payload de una etapa de boletería. Reglas (req. 5.2, 5.3):
 *   - name: cadena no vacía
 *   - price: número finito >= 0
 *   - currency: ISO 4217 (tres letras mayúsculas)
 *   - quota: entero >= 0
 */
export function validateTierInput(input: unknown): ValidationResult<TierWriteModel> {
  const data = asRecord(input)
  const errors: FieldError[] = []

  if (!isNonEmptyString(data.name)) {
    errors.push({ field: 'name', message: 'El nombre es obligatorio.' })
  }
  if (typeof data.price !== 'number' || !Number.isFinite(data.price) || data.price < 0) {
    errors.push({ field: 'price', message: 'El precio debe ser un número mayor o igual a cero.' })
  }
  if (typeof data.currency !== 'string' || !/^[A-Z]{3}$/.test(data.currency)) {
    errors.push({ field: 'currency', message: 'La moneda debe ser un código ISO 4217 de tres letras.' })
  }
  if (
    typeof data.quota !== 'number' ||
    !Number.isInteger(data.quota) ||
    data.quota < 0
  ) {
    errors.push({ field: 'quota', message: 'El cupo debe ser un entero mayor o igual a cero.' })
  }

  if (errors.length > 0) return { ok: false, errors }

  return {
    ok: true,
    value: {
      name: (data.name as string).trim(),
      price: data.price as number,
      currency: data.currency as string,
      quota: data.quota as number,
    },
  }
}
