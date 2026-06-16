<script setup lang="ts">
import type { TierCreate } from '~/types/events'

const props = defineProps<{
  initial?: Partial<TierCreate>
  loading?: boolean
  submitLabel?: string
}>()

const emit = defineEmits<{ submit: [payload: TierCreate] }>()

const name = ref(props.initial?.name ?? '')
const price = ref<number | null>(props.initial?.price ?? 0)
const currency = ref(props.initial?.currency ?? 'COP')
const quota = ref<number | null>(props.initial?.quota ?? 0)
const entryTimeLimit = ref(props.initial?.entryTimeLimit ?? '')
const surchargeAmount = ref<number | null>(props.initial?.surchargeAmount ?? 0)

const errors = reactive<Record<string, string>>({})

function validate(): boolean {
  for (const key of Object.keys(errors)) delete errors[key]
  if (!name.value.trim()) errors.name = 'El nombre es obligatorio.'
  if (price.value === null || Number.isNaN(price.value) || price.value < 0) {
    errors.price = 'El precio debe ser mayor o igual a cero.'
  }
  if (!/^[A-Z]{3}$/.test(currency.value)) errors.currency = 'Usa un código de 3 letras (p. ej. COP).'
  if (quota.value === null || !Number.isInteger(quota.value) || quota.value < 0) {
    errors.quota = 'El cupo debe ser un entero mayor o igual a cero.'
  }
  if (surchargeAmount.value === null || Number.isNaN(surchargeAmount.value) || surchargeAmount.value < 0) {
    errors.surchargeAmount = 'El recargo debe ser mayor o igual a cero.'
  }
  return Object.keys(errors).length === 0
}

function onSubmit() {
  if (props.loading) return
  if (!validate()) return
  emit('submit', {
    name: name.value.trim(),
    price: price.value as number,
    currency: currency.value.toUpperCase(),
    quota: quota.value as number,
    entryTimeLimit: entryTimeLimit.value ? entryTimeLimit.value : null,
    surchargeAmount: surchargeAmount.value as number,
  })
}
</script>

<template>
  <form class="grid grid-cols-1 gap-3 sm:grid-cols-7 sm:items-end" novalidate @submit.prevent="onSubmit">
    <div class="sm:col-span-2">
      <label class="block text-xs font-medium text-slate-600">Nombre</label>
      <input
        v-model="name"
        type="text"
        placeholder="Preventa, General, VIP…"
        class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      >
      <p v-if="errors.name" class="mt-1 text-xs text-rose-600">{{ errors.name }}</p>
    </div>
    <div>
      <label class="block text-xs font-medium text-slate-600">Precio</label>
      <input
        v-model.number="price"
        type="number"
        min="0"
        step="0.01"
        class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      >
      <p v-if="errors.price" class="mt-1 text-xs text-rose-600">{{ errors.price }}</p>
    </div>
    <div>
      <label class="block text-xs font-medium text-slate-600">Moneda</label>
      <input
        v-model="currency"
        type="text"
        maxlength="3"
        class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase focus:border-slate-500 focus:outline-none"
      >
      <p v-if="errors.currency" class="mt-1 text-xs text-rose-600">{{ errors.currency }}</p>
    </div>
    <div>
      <label class="block text-xs font-medium text-slate-600">Cupo</label>
      <input
        v-model.number="quota"
        type="number"
        min="0"
        step="1"
        class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      >
      <p v-if="errors.quota" class="mt-1 text-xs text-rose-600">{{ errors.quota }}</p>
    </div>
    <div>
      <label class="block text-xs font-medium text-slate-600">Límite Hora</label>
      <input
        v-model="entryTimeLimit"
        type="time"
        class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none bg-white"
      >
    </div>
    <div>
      <label class="block text-xs font-medium text-slate-600">Recargo</label>
      <input
        v-model.number="surchargeAmount"
        type="number"
        min="0"
        step="0.01"
        class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      >
      <p v-if="errors.surchargeAmount" class="mt-1 text-xs text-rose-600">{{ errors.surchargeAmount }}</p>
    </div>
    <div class="sm:col-span-7">
      <button
        type="submit"
        :disabled="loading"
        class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {{ loading ? 'Guardando…' : (submitLabel ?? 'Agregar etapa') }}
      </button>
    </div>
  </form>
</template>
