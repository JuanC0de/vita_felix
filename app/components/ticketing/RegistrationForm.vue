<script setup lang="ts">
import type { PublicEvent, RegistrationInput } from '~/types/ticketing'

const props = defineProps<{
  event: PublicEvent
  loading?: boolean
}>()

const emit = defineEmits<{ submit: [payload: Array<Omit<RegistrationInput, 'eventId'>>] }>()

interface AttendeeInput {
  fullName: string
  cedula: string
  email: string
  tierId: string
  errors: Record<string, string>
}

// Inicializa con el primer asistente (titular)
const attendees = ref<AttendeeInput[]>([
  {
    fullName: '',
    cedula: '',
    email: '',
    tierId: props.event.tiers[0]?.id ?? '',
    errors: {}
  }
])

function formatPrice(price: number, currency: string): string {
  if (price === 0) return 'Gratis'
  return `${price.toLocaleString('es-CO')} ${currency}`
}

function addAttendee() {
  attendees.value.push({
    fullName: '',
    cedula: '',
    email: '',
    tierId: props.event.tiers[0]?.id ?? '',
    errors: {}
  })
}

function removeAttendee(index: number) {
  if (index === 0) return
  attendees.value.splice(index, 1)
}

function validate(): boolean {
  let isValid = true
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const CEDULA_RE = /^[0-9-]{5,20}$/

  attendees.value.forEach((att) => {
    const errs: Record<string, string> = {}
    if (!att.fullName.trim()) errs.fullName = 'El nombre es obligatorio.'
    if (!CEDULA_RE.test(att.cedula.trim())) errs.cedula = 'Cédula inválida (5–20 dígitos).'
    if (!EMAIL_RE.test(att.email.trim())) errs.email = 'Correo inválido.'
    if (!att.tierId) errs.tierId = 'Selecciona una boleta.'
    att.errors = errs
    if (Object.keys(errs).length > 0) {
      isValid = false
    }
  })
  return isValid
}

function onSubmit() {
  if (props.loading) return
  if (!validate()) return
  emit('submit', attendees.value.map(a => ({
    fullName: a.fullName.trim(),
    cedula: a.cedula.trim(),
    email: a.email.trim().toLowerCase(),
    tierId: a.tierId,
  })))
}
</script>

<template>
  <form class="space-y-6" @submit.prevent="onSubmit">
    <div
      v-for="(att, index) in attendees"
      :key="index"
      class="space-y-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50 relative"
    >
      <!-- Cabecera del asistente con boton de remover -->
      <div class="flex items-center justify-between border-b border-slate-100 pb-2">
        <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Asistente {{ index + 1 }} {{ index === 0 ? '(Titular)' : '' }}
        </h4>
        <button
          v-if="index > 0"
          type="button"
          class="text-rose-600 hover:text-rose-800 text-xs font-semibold cursor-pointer"
          @click="removeAttendee(index)"
        >
          Remover
        </button>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="block text-sm font-medium text-slate-700" :for="`fullName-${index}`">Nombre completo</label>
          <input
            :id="`fullName-${index}`"
            v-model="att.fullName"
            type="text"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none bg-white"
            autocomplete="name"
          />
          <p v-if="att.errors.fullName" class="mt-1 text-xs text-rose-600 font-medium">{{ att.errors.fullName }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700" :for="`cedula-${index}`">Cédula</label>
          <input
            :id="`cedula-${index}`"
            v-model="att.cedula"
            type="text"
            inputmode="numeric"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none bg-white"
          />
          <p v-if="att.errors.cedula" class="mt-1 text-xs text-rose-600 font-medium">{{ att.errors.cedula }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700" :for="`email-${index}`">Correo electrónico</label>
          <input
            :id="`email-${index}`"
            v-model="att.email"
            type="email"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none bg-white"
            autocomplete="email"
          />
          <p v-if="att.errors.email" class="mt-1 text-xs text-rose-600 font-medium">{{ att.errors.email }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700" :for="`tier-${index}`">Tipo de Entrada</label>
          <select
            :id="`tier-${index}`"
            v-model="att.tierId"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none bg-white"
          >
            <option v-for="t in event.tiers" :key="t.id" :value="t.id">
              {{ t.name }} — {{ formatPrice(t.price, t.currency) }}
            </option>
          </select>
          <p v-if="att.errors.tierId" class="mt-1 text-xs text-rose-600 font-medium">{{ att.errors.tierId }}</p>
        </div>
      </div>
    </div>

    <!-- Acciones del Formulario -->
    <div class="flex flex-col gap-3">
      <button
        type="button"
        class="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
        @click="addAttendee"
      >
        ➕ Añadir acompañante
      </button>

      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50 transition-colors cursor-pointer"
      >
        {{ loading ? 'Procesando registros...' : 'Obtener entradas' }}
      </button>
    </div>
  </form>
</template>
