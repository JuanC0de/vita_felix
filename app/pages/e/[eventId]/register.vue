<script setup lang="ts">
import type { PublicEvent, RegistrationInput } from '~/types/ticketing'

definePageMeta({ layout: 'public' })

const route = useRoute()
const eventId = route.params.eventId as string
const { getEvent, register } = useRegistration()

const { data: event, error } = await useAsyncData<PublicEvent>(`public-event:${eventId}`, () =>
  getEvent(eventId),
)

interface RegisteredAttendee {
  fullName: string
  email: string
  ticketId: string
  pdfUrl: string
  tierName: string
}

const loading = ref(false)
const serverError = ref('')
const processState = ref<'idle' | 'processing' | 'success'>('idle')
const progressIndex = ref(0)
const progressTotal = ref(0)
const currentAttendeeName = ref('')
const registeredAttendees = ref<RegisteredAttendee[]>([])

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })
}

const progressPercentage = computed(() => {
  if (progressTotal.value === 0) return 0
  return Math.round((progressIndex.value / progressTotal.value) * 100)
})

async function onSubmit(payload: Array<Omit<RegistrationInput, 'eventId'>>) {
  processState.value = 'processing'
  loading.value = true
  serverError.value = ''
  progressTotal.value = payload.length
  progressIndex.value = 0
  registeredAttendees.value = []

  try {
    for (let i = 0; i < payload.length; i++) {
      const att = payload[i]
      if (!att) continue
      currentAttendeeName.value = att.fullName
      progressIndex.value = i + 1

      const result = await register({
        fullName: att.fullName,
        cedula: att.cedula,
        email: att.email,
        tierId: att.tierId,
        eventId,
      })

      const tierName = event.value?.tiers.find(t => t.id === att.tierId)?.name ?? 'Entrada'

      registeredAttendees.value.push({
        fullName: att.fullName,
        email: att.email,
        ticketId: result.ticketId,
        pdfUrl: result.pdfUrl,
        tierName,
      })
    }

    processState.value = 'success'
  } catch (err) {
    const e = err as { data?: { message?: string }; statusCode?: number }
    serverError.value =
      e.data?.message ??
      (e.statusCode === 409
        ? 'Ya existe un registro con esa cédula para este evento.'
        : 'No se pudo completar el registro de todos los asistentes. Verifica los datos e inténtalo de nuevo.')
    
    if (registeredAttendees.value.length > 0) {
      processState.value = 'success'
    } else {
      processState.value = 'idle'
    }
  } finally {
    loading.value = false
  }
}

function resetForm() {
  processState.value = 'idle'
  registeredAttendees.value = []
  serverError.value = ''
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-4">
    <div v-if="error" class="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700 shadow-xs">
      <div class="flex items-center gap-3">
        <svg class="h-5 w-5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>Este evento no está disponible para registro público en este momento.</span>
      </div>
    </div>

    <div v-else-if="event" class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
      
      <!-- Columna Izquierda: Flyer HD e Información Principal del Evento -->
      <div class="lg:col-span-5 space-y-6">
        <!-- Contenedor del Flyer -->
        <div class="relative overflow-hidden rounded-3xl bg-slate-900 shadow-xl border border-slate-200/20 aspect-[3/4] group">
          <img
            v-if="event.flyerUrl"
            :src="event.flyerUrl"
            :alt="event.name"
            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
          />
          <div v-else class="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-center">
            <div class="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
              <svg class="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span class="text-sm font-bold text-indigo-400 tracking-wider uppercase mb-1">Evento Exclusivo</span>
            <span class="text-xl font-bold text-white max-w-xs">{{ event.name }}</span>
          </div>

          <!-- Gradiente de superposicion oscuro inferior -->
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

          <!-- Informacion sobrepuesta en el flyer -->
          <div class="absolute bottom-0 left-0 right-0 p-6 text-white space-y-3">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-bold tracking-wider uppercase border border-white/10">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Boletería Abierta
            </span>
            <h2 class="text-2xl font-extrabold tracking-tight">{{ event.name }}</h2>
          </div>
        </div>

        <!-- Detalles detallados del evento -->
        <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-xs space-y-4">
          <div class="flex items-start gap-3.5">
            <div class="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 shrink-0">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fecha y Hora</p>
              <p class="text-sm font-bold text-slate-800 mt-0.5">{{ formatDate(event.eventAt) }}</p>
            </div>
          </div>

          <div class="flex items-start gap-3.5 border-t border-slate-50 pt-4">
            <div class="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 shrink-0">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ubicación / Lugar</p>
              <p class="text-sm font-bold text-slate-800 mt-0.5">{{ event.venue }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Columna Derecha: Formulario, Carga o Exito -->
      <div class="lg:col-span-7">
        
        <!-- Estado 1: Formulario Activo -->
        <div v-if="processState === 'idle'" class="rounded-3xl border border-slate-100 bg-white p-6 sm:p-8 shadow-sm">
          <div class="mb-6">
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Registro de Asistentes</h1>
            <p class="text-sm text-slate-500 mt-1">Completa los datos del titular y añade acompañantes de ser necesario.</p>
          </div>

          <div v-if="serverError" class="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <div class="flex items-center gap-3">
              <svg class="h-5 w-5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{{ serverError }}</span>
            </div>
          </div>

          <TicketingRegistrationForm :event="event" :loading="loading" @submit="onSubmit" />
        </div>

        <!-- Estado 2: Procesando Emision Secuencial (Lote) -->
        <div v-else-if="processState === 'processing'" class="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm flex flex-col items-center justify-center text-center space-y-6 min-h-[400px]">
          <!-- Circulo de Carga Animado -->
          <div class="relative flex items-center justify-center">
            <div class="h-20 w-20 rounded-full border-4 border-slate-100 animate-pulse" />
            <div class="absolute h-20 w-20 rounded-full border-4 border-violet-600 border-t-transparent animate-spin" />
            <svg class="absolute h-8 w-8 text-violet-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          </div>

          <div class="space-y-2 max-w-md">
            <h3 class="text-xl font-bold text-slate-800">Emitiendo boletas</h3>
            <p class="text-sm text-slate-500">
              Paso <span class="font-bold text-violet-600">{{ progressIndex }}</span> de <span class="font-bold text-slate-800">{{ progressTotal }}</span>
            </p>
            <p class="text-sm text-slate-600 font-medium italic">
              Registrando a "{{ currentAttendeeName }}"...
            </p>
          </div>

          <!-- Barra de progreso estilizada -->
          <div class="w-full max-w-md">
            <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                class="bg-gradient-to-r from-violet-600 to-indigo-600 h-3 rounded-full transition-all duration-300 ease-out"
                :style="{ width: `${progressPercentage}%` }"
              />
            </div>
            <div class="flex justify-between items-center text-xs text-slate-400 mt-2">
              <span>Progreso general</span>
              <span>{{ progressPercentage }}%</span>
            </div>
          </div>

          <p class="text-xs text-slate-400 max-w-xs leading-relaxed">
            Por favor, no cierres esta ventana ni recargues la página mientras se procesan los registros.
          </p>
        </div>

        <!-- Estado 3: Exito y Descarga de Boletas -->
        <div v-else-if="processState === 'success'" class="rounded-3xl border border-slate-100 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          
          <!-- Cabecera de Exito -->
          <div class="text-center pb-6 border-b border-slate-100 space-y-3">
            <div class="mx-auto h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div class="space-y-1">
              <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">¡Registro Completado!</h2>
              <p class="text-sm text-slate-500">Tus boletas han sido generadas y firmadas de manera exitosa.</p>
            </div>
          </div>

          <!-- Alerta de error si hubo una falla parcial -->
          <div v-if="serverError" class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <div class="flex items-start gap-3">
              <svg class="h-5 w-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <span class="font-bold">Registro incompleto:</span>
                <p class="mt-1 text-slate-600 text-xs">{{ serverError }}</p>
              </div>
            </div>
          </div>

          <!-- Listado de Boletas Generadas -->
          <div class="space-y-4">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Boletas Emitidas</h3>
            
            <div class="grid grid-cols-1 gap-3">
              <div
                v-for="att in registeredAttendees"
                :key="att.ticketId"
                class="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors gap-4"
              >
                <div class="space-y-1">
                  <p class="text-sm font-bold text-slate-800">{{ att.fullName }}</p>
                  <div class="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <span class="px-2 py-0.5 rounded bg-slate-200/60 text-slate-600 font-semibold uppercase tracking-wider text-[9px]">
                      {{ att.tierName }}
                    </span>
                    <span>•</span>
                    <span class="truncate max-w-[150px] sm:max-w-xs">{{ att.email }}</span>
                  </div>
                </div>

                <a
                  :href="att.pdfUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-700 transition-colors shrink-0 cursor-pointer shadow-xs"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar PDF
                </a>
              </div>
            </div>
          </div>

          <!-- Botones de accion final -->
          <div class="pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              class="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              @click="resetForm"
            >
              Registrar más personas
            </button>
            <NuxtLink
              to="/"
              class="flex-1 inline-flex items-center justify-center rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white hover:bg-violet-700 transition-colors cursor-pointer"
            >
              Ir al inicio
            </NuxtLink>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

