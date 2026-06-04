/**
 * Limitador de tasa básico en memoria, por clave (típicamente IP) (req. 1.6).
 *
 * Ventana deslizante simple. ADVERTENCIA: el estado vive en el proceso, por lo
 * que es por instancia (best-effort). Es una mitigación básica contra abuso
 * automatizado del endpoint público; un despliegue multi-instancia requeriría
 * un store compartido (fuera de alcance).
 */

interface Bucket {
  hits: number[]
}

const buckets = new Map<string, Bucket>()

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

/**
 * Registra un acceso para `key` y decide si se permite.
 * @param max     máximo de accesos permitidos en la ventana
 * @param windowMs duración de la ventana en milisegundos
 */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  const windowStart = now - windowMs
  const bucket = buckets.get(key) ?? { hits: [] }
  bucket.hits = bucket.hits.filter((t) => t > windowStart)

  if (bucket.hits.length >= max) {
    const oldest = bucket.hits[0] ?? now
    buckets.set(key, bucket)
    return { allowed: false, retryAfterSeconds: Math.ceil((oldest + windowMs - now) / 1000) }
  }

  bucket.hits.push(now)
  buckets.set(key, bucket)
  return { allowed: true, retryAfterSeconds: 0 }
}

/** Solo para pruebas: limpia el estado acumulado. */
export function __resetRateLimit(): void {
  buckets.clear()
}
