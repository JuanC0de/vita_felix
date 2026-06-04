import type { RegistrationModel } from '../../app/types/ticketing'

/**
 * Tipos locales (no exportados) para evitar colisión de auto-import con
 * `events-validation`, que ya expone nombres equivalentes.
 */
interface FieldError {
  field: string
  message: string
}

type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: FieldError[] }

function asRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Cédula/identificación: dígitos (y opcionalmente guiones), entre 5 y 20.
const CEDULA_RE = /^[0-9-]{5,20}$/

/**
 * Valida el payload del registro público (req. 1.2). Reglas:
 *   - tierId: UUID válido
 *   - fullName: cadena no vacía
 *   - cedula: solo dígitos/guiones, 5–20 caracteres
 *   - email: formato de correo válido
 */
export function validateRegistrationInput(input: unknown): ValidationResult<RegistrationModel> {
  const data = asRecord(input)
  const errors: FieldError[] = []

  if (!isNonEmptyString(data.tierId) || !UUID_RE.test(data.tierId as string)) {
    errors.push({ field: 'tierId', message: 'Selecciona una etapa de boletería válida.' })
  }
  if (!isNonEmptyString(data.fullName)) {
    errors.push({ field: 'fullName', message: 'El nombre es obligatorio.' })
  }
  if (!isNonEmptyString(data.cedula) || !CEDULA_RE.test((data.cedula as string).trim())) {
    errors.push({ field: 'cedula', message: 'La cédula debe contener entre 5 y 20 dígitos.' })
  }
  if (!isNonEmptyString(data.email) || !EMAIL_RE.test((data.email as string).trim())) {
    errors.push({ field: 'email', message: 'El correo electrónico es inválido.' })
  }

  if (errors.length > 0) return { ok: false, errors }

  return {
    ok: true,
    value: {
      tierId: (data.tierId as string).trim(),
      fullName: (data.fullName as string).trim(),
      cedula: (data.cedula as string).trim(),
      email: (data.email as string).trim().toLowerCase(),
    },
  }
}
