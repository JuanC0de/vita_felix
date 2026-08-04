const WIDGET_SRC = 'https://checkout.wompi.co/widget.js'
const WEB_CHECKOUT_URL = 'https://checkout.wompi.co/p/'

export interface WompiCheckoutData {
  wompiPublicKey: string
  amountInCents: number
  currency: string
  reference: string
  signature: string
  /**
   * URL de retorno de la pasarela. Debe apuntar a un host público: Wompi
   * responde 403 al abrir el checkout con localhost/127.0.0.1 y el widget
   * queda en blanco. Si es null se omite y el resultado llega por callback.
   */
  redirectUrl: string | null
}

export interface WompiTransactionResult {
  id?: string
  status?: 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR' | 'PENDING'
  reference?: string
}

let widgetPromise: Promise<any> | null = null

/**
 * Carga widget.js una única vez por sesión y resuelve con el constructor
 * global WidgetCheckout. Reinyectar el script no vuelve a inicializar el
 * widget (el propio script se protege con la variable global), por eso se
 * cachea la promesa en lugar de crear un <script> por intento de pago.
 */
function loadWidget(): Promise<any> {
  if (import.meta.server) return Promise.reject(new Error('Widget solo disponible en el cliente'))

  const existing = (window as any).WidgetCheckout
  if (typeof existing === 'function') return Promise.resolve(existing)

  if (widgetPromise !== null) return widgetPromise

  widgetPromise = new Promise((resolve, reject) => {
    // Siempre se crea un elemento nuevo: adjuntar listeners a un <script> que
    // ya disparó su evento «load» dejaría la promesa pendiente para siempre.
    // Reejecutar el bundle es inocuo (solo asigna el global si está vacío) y
    // la URL se mantiene sin query string porque el propio widget localiza su
    // etiqueta con un selector de sufijo (script[src$="wompi.co/widget.js"]).
    const script = document.createElement('script')
    script.src = WIDGET_SRC
    script.async = true

    const fail = (message: string) => {
      widgetPromise = null
      clearTimeout(timer)
      reject(new Error(message))
    }

    const timer = setTimeout(() => fail('Tiempo de espera agotado al cargar el widget de Wompi'), 15_000)

    script.addEventListener(
      'load',
      () => {
        clearTimeout(timer)
        const ctor = (window as any).WidgetCheckout
        if (typeof ctor === 'function') resolve(ctor)
        else fail('El widget de Wompi se cargó pero no expuso WidgetCheckout')
      },
      { once: true },
    )

    script.addEventListener(
      'error',
      () => {
        script.remove()
        fail('No se pudo cargar el widget de Wompi')
      },
      { once: true },
    )

    document.head.appendChild(script)
  })

  return widgetPromise
}

/**
 * Construye la URL del Web Checkout de Wompi (flujo por redirección),
 * usada como respaldo cuando el widget no está disponible.
 */
export function buildWompiCheckoutUrl(data: WompiCheckoutData): string {
  const params = new URLSearchParams({
    'public-key': data.wompiPublicKey,
    currency: data.currency,
    'amount-in-cents': String(data.amountInCents),
    reference: data.reference,
    'signature:integrity': data.signature,
  })
  if (data.redirectUrl) params.set('redirect-url', data.redirectUrl)
  return `${WEB_CHECKOUT_URL}?${params.toString()}`
}

export interface WompiCheckoutOutcome {
  /** true cuando no se pudo usar el widget y se redirigió al Web Checkout */
  redirected: boolean
  /** transacción reportada por el widget; null si el usuario cerró el modal */
  transaction: WompiTransactionResult | null
  /** presente cuando el modal nunca llegó a mostrarse */
  failure?: string
}

/** Milisegundos de gracia para que el modal del widget aparezca en el DOM. */
const MODAL_OPEN_TIMEOUT_MS = 20_000

/**
 * Vigila el cierre del modal del widget. Wompi no invoca el callback de
 * `open()` cuando el usuario abandona el pago cerrando el modal, así que sin
 * esta vigilancia la promesa quedaría pendiente y el formulario bloqueado.
 * Al cerrarse, el widget oculta su contenedor (`display: none`).
 */
function watchModalLifecycle(handlers: { onClose: () => void; onNeverOpened: () => void }): () => void {
  let appeared = false
  let elapsed = 0
  const INTERVAL_MS = 250

  // Se comprueban dos anclas: el contenedor del widget y el iframe del
  // checkout. Basta con que una siga presente para considerarlo abierto, de
  // modo que un cambio de nombre de clase en Wompi no lo dé por cerrado.
  const isVisible = () => {
    const candidates = [
      document.querySelector<HTMLElement>('[class*="waybox-modal"]'),
      document.querySelector<HTMLElement>('iframe[src*="checkout.wompi.co/p/"]'),
    ]
    return candidates.some((el) => !!el && (el.offsetWidth > 0 || el.offsetHeight > 0))
  }

  const timer = setInterval(() => {
    elapsed += INTERVAL_MS

    if (isVisible()) {
      appeared = true
      return
    }
    if (appeared) {
      clearInterval(timer)
      handlers.onClose()
      return
    }
    if (elapsed >= MODAL_OPEN_TIMEOUT_MS) {
      clearInterval(timer)
      handlers.onNeverOpened()
    }
  }, INTERVAL_MS)

  return () => clearInterval(timer)
}

export function useWompiCheckout() {
  /**
   * Abre la pasarela de Wompi. Intenta el widget modal y, si no está
   * disponible, redirige al Web Checkout con los mismos parámetros.
   */
  async function openCheckout(data: WompiCheckoutData): Promise<WompiCheckoutOutcome> {
    let WidgetCheckout: any
    try {
      WidgetCheckout = await loadWidget()
    } catch (err) {
      console.warn('[wompi] widget no disponible, se usa Web Checkout por redirección:', err)
      await navigateTo(buildWompiCheckoutUrl(data), { external: true })
      return { redirected: true, transaction: null }
    }

    return new Promise((resolve) => {
      let settled = false
      let stopWatching: (() => void) | null = null

      const settle = (outcome: WompiCheckoutOutcome) => {
        if (settled) return
        settled = true
        stopWatching?.()
        resolve(outcome)
      }

      const checkout = new WidgetCheckout({
        currency: data.currency,
        amountInCents: data.amountInCents,
        reference: data.reference,
        publicKey: data.wompiPublicKey,
        signature: { integrity: data.signature },
        // Se omite por completo cuando no hay un host público: enviarla con
        // localhost hace que Wompi responda 403 y el modal quede vacío.
        ...(data.redirectUrl ? { redirectUrl: data.redirectUrl } : {}),
      })

      checkout.open((result: { transaction?: WompiTransactionResult }) => {
        settle({ redirected: false, transaction: result?.transaction ?? null })
      })

      stopWatching = watchModalLifecycle({
        onClose: () => settle({ redirected: false, transaction: null }),
        onNeverOpened: () =>
          settle({
            redirected: false,
            transaction: null,
            failure: 'No se pudo abrir la pasarela de pagos. Revisa tu conexión e inténtalo de nuevo.',
          }),
      })
    })
  }

  return { openCheckout, buildWompiCheckoutUrl }
}
