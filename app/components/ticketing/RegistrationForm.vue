<script setup lang="ts">
import type { PublicEvent, RegistrationInput } from '~/types/ticketing'

const props = defineProps<{
  event: PublicEvent
  loading?: boolean
  defaultTierId?: string
}>()

const emit = defineEmits<{
  submit: [payload: Array<Omit<RegistrationInput, 'eventId'>>]
}>()

// --- Flujo Wompi (Múltiples Tickets por Lote) ---
const currentStep = ref<'select' | 'details'>('select')

// Inicializar cantidades de tickets por tier
const ticketQuantities = ref<Record<string, number>>({})
props.event.tiers.forEach((tier) => {
  ticketQuantities.value[tier.id] = props.defaultTierId === tier.id ? 1 : 0
})

const totalTicketsCount = computed(() => {
  return Object.values(ticketQuantities.value).reduce((sum, qty) => sum + qty, 0)
})

const totalAmount = computed(() => {
  return props.event.tiers.reduce((sum, tier) => {
    const qty = ticketQuantities.value[tier.id] || 0
    return sum + tier.price * qty
  }, 0)
})

// Estructura de asistentes para el flujo Wompi
interface WompiAttendeeInput {
  fullName: string
  cedula: string
  email: string
  tierId: string
  tierName: string
  errors: Record<string, string>
}
const wompiAttendees = ref<WompiAttendeeInput[]>([])

function goToDetails() {
  if (totalTicketsCount.value === 0) return

  // Construir la lista de asistentes requerida en base a las cantidades elegidas
  const newAttendees: WompiAttendeeInput[] = []
  props.event.tiers.forEach((tier) => {
    const qty = ticketQuantities.value[tier.id] || 0
    for (let i = 0; i < qty; i++) {
      newAttendees.push({
        fullName: '',
        cedula: '',
        email: '',
        tierId: tier.id,
        tierName: tier.name,
        errors: {},
      })
    }
  })
  wompiAttendees.value = newAttendees
  currentStep.value = 'details'
}

function validateWompi(): boolean {
  let isValid = true
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const CEDULA_RE = /^[0-9-]{5,20}$/

  wompiAttendees.value.forEach((att) => {
    const errs: Record<string, string> = {}
    if (!att.fullName.trim()) errs.fullName = 'El nombre es obligatorio.'
    if (!CEDULA_RE.test(att.cedula.trim())) errs.cedula = 'Cédula inválida (5–20 dígitos).'
    if (!EMAIL_RE.test(att.email.trim())) errs.email = 'Correo inválido.'
    att.errors = errs
    if (Object.keys(errs).length > 0) {
      isValid = false
    }
  })
  return isValid
}

function onSubmitWompi() {
  if (props.loading) return
  if (!validateWompi()) return

  emit(
    'submit',
    wompiAttendees.value.map((a) => ({
      fullName: a.fullName.trim(),
      cedula: a.cedula.trim(),
      email: a.email.trim().toLowerCase(),
      tierId: a.tierId,
    }))
  )
}

// --- Flujo Tradicional (Registro Individual Secuencial) ---
interface LegacyAttendeeInput {
  fullName: string
  cedula: string
  email: string
  tierId: string
  errors: Record<string, string>
}

const isTierValid = computed(() => {
  return !!props.defaultTierId && props.event.tiers.some((t) => t.id === props.defaultTierId)
})

const getInitialTierId = () => {
  return isTierValid.value ? props.defaultTierId || '' : props.event.tiers[0]?.id ?? ''
}

const legacyAttendees = ref<LegacyAttendeeInput[]>([
  {
    fullName: '',
    cedula: '',
    email: '',
    tierId: getInitialTierId(),
    errors: {},
  },
])

const filteredTiers = computed(() => {
  if (isTierValid.value) {
    return props.event.tiers.filter((t) => t.id === props.defaultTierId)
  }
  return props.event.tiers
})

function addLegacyAttendee() {
  legacyAttendees.value.push({
    fullName: '',
    cedula: '',
    email: '',
    tierId: getInitialTierId(),
    errors: {},
  })
}

function removeLegacyAttendee(index: number) {
  if (index === 0) return
  legacyAttendees.value.splice(index, 1)
}

function validateLegacy(): boolean {
  let isValid = true
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const CEDULA_RE = /^[0-9-]{5,20}$/

  legacyAttendees.value.forEach((att) => {
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

function onSubmitLegacy() {
  if (props.loading) return
  if (!validateLegacy()) return
  emit(
    'submit',
    legacyAttendees.value.map((a) => ({
      fullName: a.fullName.trim(),
      cedula: a.cedula.trim(),
      email: a.email.trim().toLowerCase(),
      tierId: a.tierId,
    }))
  )
}
</script>

<template>
  <div>
    <!-- ========================================================================= -->
    <!-- FLUJO A: Pasarela Wompi Activa (Selección Múltiple + Pago Consolidado)   -->
    <!-- ========================================================================= -->
    <div v-if="event.wompiEnabled" class="space-y-6">
      
      <!-- Paso 1: Selección de Cantidades y Resumen -->
      <div v-if="currentStep === 'select'" class="space-y-6">
        <div class="space-y-4">
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Selecciona tus Entradas</h3>
          
          <div class="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/20 p-2">
            <div
              v-for="tier in event.tiers"
              :key="tier.id"
              class="flex items-center justify-between p-4 gap-4"
            >
              <div class="space-y-1">
                <p class="text-sm font-bold text-slate-800">{{ tier.name }}</p>
                <p class="text-xs text-slate-500 font-semibold">
                  {{ tier.price === 0 ? 'Gratis' : `${tier.price.toLocaleString('es-CO')} ${tier.currency}` }}
                </p>
              </div>

              <!-- Selector de Cantidad -->
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="h-8 w-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 cursor-pointer text-sm font-bold"
                  :disabled="!ticketQuantities[tier.id]"
                  @click="ticketQuantities[tier.id] = Math.max(0, ticketQuantities[tier.id] - 1)"
                >
                  -
                </button>
                <span class="w-8 text-center text-sm font-extrabold text-slate-800">
                  {{ ticketQuantities[tier.id] || 0 }}
                </span>
                <button
                  type="button"
                  class="h-8 w-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 cursor-pointer text-sm font-bold"
                  @click="ticketQuantities[tier.id] = (ticketQuantities[tier.id] || 0) + 1"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Resumen de Compra -->
        <div v-if="totalTicketsCount > 0" class="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 space-y-3">
          <div class="flex justify-between text-xs text-slate-500 font-semibold">
            <span>Entradas seleccionadas</span>
            <span>{{ totalTicketsCount }}</span>
          </div>
          <div class="flex justify-between items-center text-sm font-extrabold text-slate-800 border-t border-slate-200/60 pt-3">
            <span>Total a Pagar</span>
            <span class="text-base text-indigo-600">{{ totalAmount === 0 ? 'Gratis' : `$${totalAmount.toLocaleString('es-CO')} COP` }}</span>
          </div>
        </div>

        <button
          type="button"
          :disabled="totalTicketsCount === 0"
          class="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          @click="goToDetails"
        >
          Siguiente: Datos de Asistentes
        </button>
      </div>

      <!-- Paso 2: Datos de Asistentes -->
      <form v-else-if="currentStep === 'details'" class="space-y-6" @submit.prevent="onSubmitWompi">
        <div class="flex justify-between items-center pb-2 border-b border-slate-100">
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Datos de los Asistentes</h3>
          <button
            type="button"
            class="text-xs text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
            @click="currentStep = 'select'"
          >
            ← Volver a Entradas
          </button>
        </div>

        <div class="space-y-6">
          <div
            v-for="(att, index) in wompiAttendees"
            :key="index"
            class="space-y-4 p-4 rounded-xl border border-slate-200 bg-slate-50/30"
          >
            <div class="flex justify-between border-b border-slate-100 pb-2">
              <h4 class="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                <span>Asistente {{ index + 1 }}</span>
                <span class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[9px] font-extrabold uppercase">
                  {{ att.tierName }}
                </span>
              </h4>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label class="block text-sm font-medium text-slate-700" :for="`wompi-name-${index}`">Nombre completo</label>
                <input
                  :id="`wompi-name-${index}`"
                  v-model="att.fullName"
                  type="text"
                  class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none bg-white"
                  placeholder="Ej: Juan Pérez"
                />
                <p v-if="att.errors.fullName" class="mt-1 text-xs text-rose-600 font-medium">{{ att.errors.fullName }}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700" :for="`wompi-cedula-${index}`">Cédula</label>
                <input
                  :id="`wompi-cedula-${index}`"
                  v-model="att.cedula"
                  type="text"
                  inputmode="numeric"
                  class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none bg-white"
                  placeholder="Ej: 12345678"
                />
                <p v-if="att.errors.cedula" class="mt-1 text-xs text-rose-600 font-medium">{{ att.errors.cedula }}</p>
              </div>

              <div class="sm:col-span-2">
                <label class="block text-sm font-medium text-slate-700" :for="`wompi-email-${index}`">Correo electrónico</label>
                <input
                  :id="`wompi-email-${index}`"
                  v-model="att.email"
                  type="email"
                  class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none bg-white"
                  placeholder="ejemplo@correo.com"
                />
                <p v-if="att.errors.email" class="mt-1 text-xs text-rose-600 font-medium">{{ att.errors.email }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Botones de Acción -->
        <div class="flex flex-col gap-3 border-t border-slate-100 pt-4">
          <div class="flex justify-between items-center text-xs text-slate-500 font-semibold mb-1">
            <span>Total a pagar por {{ totalTicketsCount }} entradas</span>
            <span class="text-sm font-extrabold text-indigo-600">{{ totalAmount === 0 ? 'Gratis' : `$${totalAmount.toLocaleString('es-CO')} COP` }}</span>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {{ loading ? 'Preparando pago...' : (totalAmount === 0 ? 'Obtener Entradas Gratuitas' : 'Proceder al Pago Seguro') }}
          </button>
        </div>
      </form>
    </div>

    <!-- ========================================================================= -->
    <!-- FLUJO B: Tradicional/Legacy (Registro Individual Secuencial)             -->
    <!-- ========================================================================= -->
    <form v-else class="space-y-6" @submit.prevent="onSubmitLegacy">
      <div
        v-for="(att, index) in legacyAttendees"
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
            @click="removeLegacyAttendee(index)"
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
              :disabled="isTierValid"
              class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none bg-white disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option v-for="t in filteredTiers" :key="t.id" :value="t.id">
                {{ t.name }} — {{ t.price === 0 ? 'Gratis' : `${t.price.toLocaleString('es-CO')} ${t.currency}` }}
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
          @click="addLegacyAttendee"
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
  </div>
</template>
