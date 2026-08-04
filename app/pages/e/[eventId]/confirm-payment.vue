<script setup lang="ts">
import type { PublicEvent } from '~/types/ticketing'

definePageMeta({ layout: 'public' })

const route = useRoute()
const eventId = route.params.eventId as string
const reference = computed(() => (route.query.reference as string | undefined) || '')

const { getEvent } = useRegistration()
const { data: event } = await useAsyncData<PublicEvent>(`public-event:${eventId}`, () =>
  getEvent(eventId),
)

interface TicketResult {
  ticketId: string
  fullName: string
  email: string
  tierName: string
  pdfUrl: string
}

const status = ref<'pending' | 'approved' | 'declined' | 'voided' | 'error'>('pending')
const tickets = ref<TicketResult[]>([])
const loading = ref(true)
const errorMessage = ref('')
// Tras este tiempo sin confirmación se ofrece una salida: quien cerró la
// pasarela sin pagar nunca recibirá un webhook y no debe quedar atrapado.
const waitedTooLong = ref(false)
const WAIT_LIMIT_MS = 90_000
let waitLimitTimer: any = null
let pollingInterval: any = null
let realtimeChannel: any = null

async function checkStatus() {
  if (!reference.value) {
    status.value = 'error'
    errorMessage.value = 'Referencia de pago no suministrada.'
    loading.value = false
    return
  }

  try {
    const res = await $fetch<{ status: typeof status.value; tickets: TicketResult[] }>(
      '/api/public/payments/tickets-by-reference',
      { query: { reference: reference.value } }
    )

    status.value = res.status
    if (res.status === 'approved') {
      tickets.value = res.tickets
      loading.value = false
      stopPolling()
    } else if (res.status !== 'pending') {
      loading.value = false
      stopPolling()
    }
  } catch (err: any) {
    console.error('Error al verificar estado de transacción:', err)
  }
}

function startPolling() {
  pollingInterval = setInterval(checkStatus, 4000)
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

// Suscripción en tiempo real a Supabase
function initRealtime() {
  try {
    const supabase = useSupabaseClient()
    realtimeChannel = supabase
      .channel('transaction-status-confirm')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payment_transactions',
          filter: `reference=eq.${reference.value}`,
        },
        (payload: any) => {
          const newStatus = payload.new.status
          status.value = newStatus
          if (newStatus === 'approved') {
            checkStatus() // Recargar boletas
          } else if (newStatus !== 'pending') {
            loading.value = false
            stopPolling()
          }
        }
      )
      .subscribe()
  } catch (err) {
    console.error('Error al inicializar Supabase Realtime:', err)
  }
}

onMounted(() => {
  checkStatus()
  startPolling()
  initRealtime()
  waitLimitTimer = setTimeout(() => {
    if (status.value === 'pending') waitedTooLong.value = true
  }, WAIT_LIMIT_MS)
})

onBeforeUnmount(() => {
  stopPolling()
  if (waitLimitTimer) clearTimeout(waitLimitTimer)
  if (realtimeChannel) {
    const supabase = useSupabaseClient()
    supabase.removeChannel(realtimeChannel)
  }
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' })
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-8">
    <div v-if="!reference" class="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800 space-y-4">
      <div class="mx-auto h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 class="text-xl font-bold">Referencia Inválida</h2>
      <p class="text-sm">No se ha suministrado una referencia válida de transacción de pago.</p>
      <NuxtLink :to="`/e/${eventId}/register`" class="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-700 transition-colors">
        Volver al registro
      </NuxtLink>
    </div>

    <div v-else class="space-y-6">
      
      <!-- Estado 1: Pendiente (Procesando) -->
      <div v-if="status === 'pending'" class="rounded-3xl border border-slate-100 bg-white p-8 sm:p-12 shadow-sm flex flex-col items-center justify-center text-center space-y-6 min-h-[400px]">
        <div class="relative flex items-center justify-center">
          <div class="h-24 w-24 rounded-full border-4 border-slate-100 animate-pulse" />
          <div class="absolute h-24 w-24 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
          <svg class="absolute h-10 w-10 text-indigo-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>

        <div class="space-y-2 max-w-md">
          <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">Procesando tu pago</h2>
          <p class="text-sm text-slate-500">Estamos esperando la confirmación de la transacción por parte de la pasarela de pagos.</p>
          <p class="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-2">Referencia: {{ reference }}</p>
        </div>

        <div class="w-full max-w-xs bg-slate-100 rounded-full h-1.5 overflow-hidden animate-pulse">
          <div class="bg-indigo-600 h-1.5 w-1/2 rounded-full animate-infinite-scroll" style="animation: scroll 2s infinite linear;" />
        </div>

        <p class="text-xs text-slate-400 max-w-xs leading-relaxed">
          Por favor, **no cierres esta ventana** ni regreses atrás. Una vez confirmado el pago, tus boletas aparecerán aquí automáticamente.
        </p>

        <!-- Salida para quien cerró la pasarela sin completar el pago -->
        <div v-if="waitedTooLong" class="w-full max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left space-y-3">
          <p class="text-xs text-amber-800 leading-relaxed">
            Aún no recibimos la confirmación de la pasarela. Si completaste el pago, esta página se
            actualizará sola en cuanto llegue. Si cerraste la pasarela sin pagar, puedes volver al registro.
          </p>
          <NuxtLink
            :to="`/e/${eventId}/register`"
            class="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700 transition-colors"
          >
            Volver al registro
          </NuxtLink>
        </div>
      </div>

      <!-- Estado 2: Aprobado (Éxito) -->
      <div v-else-if="status === 'approved'" class="rounded-3xl border border-slate-100 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div class="text-center pb-6 border-b border-slate-100 space-y-3">
          <div class="mx-auto h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-xs">
            <svg class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div class="space-y-1">
            <h2 class="text-3xl font-extrabold text-slate-950 tracking-tight">¡Pago Aprobado con Éxito!</h2>
            <p class="text-sm text-slate-500">Tus entradas han sido generadas, firmadas y enviadas a tu correo.</p>
          </div>
        </div>

        <!-- Info del Evento -->
        <div v-if="event" class="rounded-2xl border border-slate-100 bg-slate-50/30 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Evento</span>
            <span class="text-sm font-bold text-slate-800">{{ event.name }}</span>
          </div>
          <div>
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Fecha y Lugar</span>
            <span class="text-sm font-bold text-slate-800">{{ formatDate(event.eventAt) }} • {{ event.venue }}</span>
          </div>
        </div>

        <!-- Listado de Boletas -->
        <div class="space-y-4">
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Tus Boletas</h3>
          
          <div class="grid grid-cols-1 gap-3">
            <div
              v-for="ticket in tickets"
              :key="ticket.ticketId"
              class="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors gap-4"
            >
              <div class="space-y-1">
                <p class="text-sm font-bold text-slate-800">{{ ticket.fullName }}</p>
                <div class="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <span class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 font-extrabold uppercase text-[9px]">
                    {{ ticket.tierName }}
                  </span>
                  <span>•</span>
                  <span>{{ ticket.email }}</span>
                </div>
              </div>

              <a
                v-if="ticket.pdfUrl"
                :href="ticket.pdfUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-700 transition-colors shrink-0 shadow-xs"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar PDF
              </a>
            </div>
          </div>
        </div>

        <!-- Botón de retorno -->
        <div class="pt-6 border-t border-slate-100 text-center">
          <NuxtLink to="/" class="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition-colors cursor-pointer">
            Ir al inicio
          </NuxtLink>
        </div>
      </div>

      <!-- Estado 3: Fallido / Declinado / Error -->
      <div v-else class="rounded-3xl border border-slate-100 bg-white p-8 sm:p-12 shadow-sm flex flex-col items-center justify-center text-center space-y-6">
        <div class="mx-auto h-16 w-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 shadow-xs">
          <svg class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <div class="space-y-2 max-w-md">
          <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">El pago no pudo completarse</h2>
          <p class="text-sm text-slate-500">
            La transacción fue declinada por la pasarela de pagos o ocurrió un error al procesar el recaudo.
          </p>
          <p class="text-xs text-rose-600 font-bold bg-rose-50 px-3 py-1.5 rounded-lg mt-2 inline-block">
            Estado: {{ status.toUpperCase() }}
          </p>
        </div>

        <p class="text-xs text-slate-400 max-w-xs leading-relaxed">
          No se ha realizado ningún cobro de tu tarjeta de crédito o cuenta PSE. Por favor, vuelve a intentarlo con otro método de pago.
        </p>

        <div class="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <NuxtLink :to="`/e/${eventId}/register`" class="flex-1 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-700 transition-colors">
            Reintentar Registro
          </NuxtLink>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
@keyframes scroll {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
.animate-infinite-scroll {
  animation: scroll 2s infinite linear;
}
</style>
