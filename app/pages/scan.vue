<script setup lang="ts">
import type { CheckinResult } from '~/types/ticketing'

definePageMeta({ requiredRoles: ['GATE_STAFF', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER'] })

const { validate } = useCheckin()
const { list: listEvents } = useEvents()

const { data: events } = await useAsyncData('scan:events', () => listEvents().catch(() => []))

const selectedEventId = ref('')

// Si hay eventos disponibles, autoseleccionar el primero
onMounted(() => {
  if (events.value && events.value.length > 0) {
    selectedEventId.value = events.value[0]?.id || ''
  }
})

const result = ref<CheckinResult | null>(null)
const checking = ref(false)
const error = ref('')

interface ScanRecord {
  time: string
  name: string
  result: string
  tierName: string
}
const scanHistory = ref<ScanRecord[]>([])

async function onDetected(token: string) {
  if (!selectedEventId.value) {
    error.value = 'Selecciona primero el evento activo en portería.'
    return
  }

  if (checking.value) return
  checking.value = true
  error.value = ''
  result.value = null
  
  try {
    const res = await validate(token, selectedEventId.value)
    result.value = res

    // Enriquecer historial de escaneos
    let name = 'Desconocido'
    let tierName = 'Desconocido'
    let statusText = 'Inválido'

    if (res.status === 'admitted') {
      name = res.attendee.fullName
      tierName = res.attendee.tierName
      statusText = 'Admitido'
    } else if (res.status === 'already_used') {
      name = 'Repetido'
      tierName = 'N/A'
      statusText = 'Ya usado'
    } else if (res.status === 'invalid') {
      name = 'Inválido'
      tierName = 'N/A'
      statusText = `Rechazado: ${res.reason}`
    }

    scanHistory.value.unshift({
      time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      name,
      result: statusText,
      tierName,
    })

    // Mantener sólo los últimos 10
    scanHistory.value = scanHistory.value.slice(0, 10)
  } catch {
    error.value = 'No se pudo validar el código QR. Inténtalo de nuevo.'
  } finally {
    checking.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- AppPageHeader -->
    <AppPageHeader
      title="Control de acceso QR"
      subtitle="Valida las entradas en portería escaneando los códigos QR de los asistentes."
    />

    <!-- Selector de Evento Activo -->
    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs max-w-md">
      <AppSelect
        v-model="selectedEventId"
        label="Selecciona el evento en puerta"
        :options="(events ?? []).map(e => ({ value: e.id, label: e.name }))"
        required
      />
    </div>

    <!-- Layout Dividido: Escáner y Feedback (Izquierda) + Historial (Derecha) -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Columna del Escáner y Alerta -->
      <div class="lg:col-span-2 space-y-4">
        <AppCard>
          <template #header>
            <h3 class="font-bold text-slate-900">Cámara de escaneo</h3>
          </template>
          
          <div class="relative max-w-sm mx-auto">
            <TicketingScannerView @detected="onDetected" />
            
            <!-- Indicador visual de carga -->
            <div
              v-if="checking"
              class="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-semibold text-sm backdrop-blur-xs rounded-lg"
            >
              <svg class="h-8 w-8 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          </div>

          <p v-if="error" class="mt-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 text-center">
            {{ error }}
          </p>
        </AppCard>

        <!-- Feedback Visual Gigante (Semáforo de validación) -->
        <div v-if="result">
          <!-- CASO 1: ADMITIDO (Verde) -->
          <div
            v-if="result.status === 'admitted'"
            class="rounded-xl border border-emerald-300 bg-emerald-50 p-6 text-emerald-900 shadow-md text-center space-y-2 animate-bounce-short"
          >
            <div class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white font-bold text-xl mb-1 shadow-sm">
              ✓
            </div>
            <h4 class="text-2xl font-black tracking-tight">ACCESO ADMITIDO</h4>
            <div class="text-sm font-semibold text-emerald-800">
              <p class="text-base font-bold text-slate-900">{{ result.attendee.fullName }}</p>
              <p class="text-xs text-slate-600 mt-0.5">Entrada: {{ result.attendee.tierName }}</p>
              <p class="text-[10px] text-slate-400 mt-1">Hora ingreso: {{ new Date(result.checkedInAt).toLocaleTimeString('es-CO') }}</p>
            </div>
          </div>

          <!-- CASO 2: REPETIDO (Naranja) -->
          <div
            v-else-if="result.status === 'already_used'"
            class="rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-900 shadow-md text-center space-y-2 animate-pulse"
          >
            <div class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-white font-bold text-xl mb-1 shadow-sm">
              !
            </div>
            <h4 class="text-2xl font-black tracking-tight">TICKET YA UTILIZADO</h4>
            <div class="text-sm font-semibold text-amber-800">
              <p class="text-slate-700">Este boleto ya ingresó a la sala anteriormente.</p>
              <p class="text-xs text-slate-500 mt-1" v-if="result.usedAt">
                Primer ingreso: {{ new Date(result.usedAt).toLocaleString('es-CO') }}
              </p>
            </div>
          </div>

          <!-- CASO 3: INVÁLIDO (Rojo) -->
          <div
            v-else-if="result.status === 'invalid'"
            class="rounded-xl border border-rose-300 bg-rose-50 p-6 text-rose-900 shadow-md text-center space-y-2"
          >
            <div class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-500 text-white font-bold text-xl mb-1 shadow-sm">
              ✕
            </div>
            <h4 class="text-2xl font-black tracking-tight">ACCESO RECHAZADO</h4>
            <div class="text-sm font-semibold text-rose-800">
              <p class="font-bold text-slate-800">Código inválido o de otra organización.</p>
              <p class="text-xs text-slate-500 mt-1">
                Motivo: {{ 
                  result.reason === 'signature' ? 'Firma inválida' :
                  result.reason === 'expired' ? 'Token expirado' :
                  result.reason === 'void' ? 'Ticket anulado' : 
                  result.reason === 'event_cancelled' ? 'Evento cancelado' : 'Fallo de verificación'
                }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Columna del Historial de Escaneos -->
      <div>
        <AppCard class="h-full">
          <template #header>
            <h3 class="font-bold text-slate-900">Historial de control</h3>
          </template>
          
          <div v-if="scanHistory.length === 0" class="text-center py-12 text-sm text-slate-400">
            Los escaneos procesados en esta sesión aparecerán aquí.
          </div>
          
          <ul v-else class="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
            <li
              v-for="(sh, idx) in scanHistory"
              :key="idx"
              class="py-3 text-xs space-y-1.5"
            >
              <div class="flex items-center justify-between font-semibold">
                <span class="text-slate-900 truncate max-w-[120px]">{{ sh.name }}</span>
                <span
                  class="rounded-sm px-1.5 py-0.5 text-[9px] font-bold tracking-tight uppercase"
                  :class="[
                    sh.result === 'Admitido' && 'bg-emerald-50 text-emerald-700 border border-emerald-100',
                    sh.result === 'Ya usado' && 'bg-amber-50 text-amber-700 border border-amber-100',
                    sh.result.startsWith('Rechazado') && 'bg-rose-50 text-rose-700 border border-rose-100'
                  ]"
                >
                  {{ sh.result }}
                </span>
              </div>
              <div class="flex justify-between text-[10px] text-slate-400">
                <span>Tier: {{ sh.tierName }}</span>
                <span>{{ sh.time }}</span>
              </div>
            </li>
          </ul>
        </AppCard>
      </div>
    </div>
  </div>
</template>
