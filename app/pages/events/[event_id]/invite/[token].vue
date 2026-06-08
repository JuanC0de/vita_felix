<script setup lang="ts">
import type { InvitationStatus } from '~/types/invitations'

definePageMeta({
  layout: 'public',
  public: true,
})

const route = useRoute()
const eventId = route.params.event_id as string
const token = route.params.token as string

const loading = ref(true)
const status = ref<InvitationStatus | null>(null)
const errorMsg = ref('')

const fullName = ref('')
const email = ref('')
const cedula = ref('')
const submitting = ref(false)
const successResult = ref<{ ticketId: string; pdfUrl: string } | null>(null)
const validationError = ref('')

// Al montar el componente, validar el token de invitación
onMounted(async () => {
  try {
    const data = await $fetch<InvitationStatus>(`/api/public/invite/${token}/status`, {
      query: { eventId },
    })
    status.value = data
  } catch (err: any) {
    errorMsg.value = err.data?.statusMessage || 'Este enlace de invitación no es válido o ya ha caducado.'
  } finally {
    loading.value = false
  }
})

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateForm(): boolean {
  if (!fullName.value.trim() || !email.value.trim() || !cedula.value.trim()) {
    validationError.value = 'Por favor, completa todos los campos requeridos.'
    return false
  }
  if (!EMAIL_RE.test(email.value.trim())) {
    validationError.value = 'El formato del correo electrónico no es válido.'
    return false
  }
  validationError.value = ''
  return true
}

async function onSubmit() {
  validationError.value = ''
  if (!validateForm()) return
  if (submitting.value) return

  submitting.value = true
  try {
    const res = await $fetch<{ ticketId: string; pdfUrl: string }>(`/api/public/invite/${token}/register`, {
      method: 'POST',
      body: {
        eventId,
        fullName: fullName.value,
        email: email.value,
        cedula: cedula.value,
      },
    })
    successResult.value = res
  } catch (err: any) {
    validationError.value = err.data?.statusMessage || 'No se pudo completar el registro de tu cortesía. Intenta nuevamente.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
    <!-- Carga inicial -->
    <div v-if="loading" class="text-center space-y-4 animate-pulse">
      <div class="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-slate-400 text-sm">Validando invitación...</p>
    </div>

    <!-- Error de Token/Evento -->
    <div v-else-if="errorMsg" class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
      <div class="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto text-rose-400 text-3xl">
        ✕
      </div>
      <div class="space-y-2">
        <h2 class="text-xl font-bold text-white">Invitación no disponible</h2>
        <p class="text-slate-400 text-sm leading-relaxed">{{ errorMsg }}</p>
      </div>
      <NuxtLink
        to="/"
        class="inline-block w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 px-4 rounded-xl transition duration-200"
      >
        Ir al inicio
      </NuxtLink>
    </div>

    <!-- Registro Exitoso -->
    <div v-else-if="successResult" class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl animate-fade-in">
      <div class="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400 text-3xl">
        ✓
      </div>
      <div class="space-y-2">
        <h2 class="text-xl font-bold text-white">¡Registro Exitoso!</h2>
        <p class="text-slate-400 text-sm">
          Tu ticket de cortesía ha sido generado. También lo hemos enviado a tu correo electrónico.
        </p>
      </div>
      <div class="pt-4 space-y-3">
        <a
          :href="successResult.pdfUrl"
          target="_blank"
          download
          class="block w-full text-center bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-violet-600/20 transition duration-200"
        >
          Descargar Ticket PDF
        </a>
      </div>
    </div>

    <!-- Formulario de Registro -->
    <div v-else-if="status" class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      <!-- Flyer o Cabecera visual -->
      <div class="relative h-48 bg-gradient-to-br from-violet-950 to-slate-900 flex items-center justify-center p-4">
        <img
          v-if="status.flyerUrl"
          :src="status.flyerUrl"
          alt="Flyer del Evento"
          class="h-full object-contain rounded-lg shadow-lg border border-slate-800"
        />
        <div v-else class="text-center">
          <div class="text-slate-400 font-bold tracking-widest text-xs uppercase mb-1">CORTESÍA ESPECIAL</div>
          <div class="text-white font-extrabold text-lg">{{ status.eventName }}</div>
        </div>
      </div>

      <!-- Cuerpo del Formulario -->
      <div class="p-8 space-y-6">
        <div class="space-y-1 text-center">
          <p class="text-xs font-semibold text-violet-400 tracking-wider uppercase">Invitación Exclusiva</p>
          <h1 class="text-lg font-bold text-white leading-tight">
            Invitado por <span class="text-violet-300">{{ status.hostName }}</span>
          </h1>
        </div>

        <form class="space-y-4" novalidate @submit.prevent="onSubmit">
          <div class="space-y-1">
            <label class="block text-xs font-semibold text-slate-400 uppercase">Nombre Completo</label>
            <input
              v-model="fullName"
              type="text"
              required
              placeholder="Juan Pérez"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition duration-200"
            />
          </div>

          <div class="space-y-1">
            <label class="block text-xs font-semibold text-slate-400 uppercase">Correo Electrónico</label>
            <input
              v-model="email"
              type="email"
              required
              placeholder="juan@ejemplo.com"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition duration-200"
            />
          </div>

          <div class="space-y-1">
            <label class="block text-xs font-semibold text-slate-400 uppercase">Documento / Cédula</label>
            <input
              v-model="cedula"
              type="text"
              required
              placeholder="1234567890"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition duration-200"
            />
          </div>

          <!-- Errores de Validación -->
          <div
            v-if="validationError"
            role="alert"
            class="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300 leading-normal"
          >
            {{ validationError }}
          </div>

          <button
            type="submit"
            :disabled="submitting"
            class="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-violet-600/20 transition duration-200"
          >
            <span v-if="submitting">Procesando...</span>
            <span v-else>Confirmar y Obtener Ticket</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
