<script setup lang="ts">
interface Option {
  value: string | number
  label: string
}

interface Props {
  modelValue: string | number | null | undefined
  options: Option[]
  label?: string
  id?: string
  placeholder?: string
  error?: string
  required?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Selecciona una opción',
  error: '',
  required: false,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

const selectId = computed(() => props.id ?? `select-${Math.random().toString(36).substr(2, 9)}`)

function onChange(e: Event) {
  const target = e.target as HTMLSelectElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="space-y-1">
    <label
      v-if="label"
      :for="selectId"
      class="block text-sm font-medium text-slate-700"
    >
      {{ label }}
      <span v-if="required" class="text-rose-500">*</span>
    </label>

    <div class="relative">
      <select
        :id="selectId"
        :value="modelValue"
        :disabled="disabled"
        class="w-full appearance-none rounded-lg border bg-white px-3 py-2 pr-10 text-sm font-normal text-slate-900 transition-colors duration-200 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
        :class="[
          error
            ? 'border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
            : 'border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900'
        ]"
        @change="onChange"
      >
        <option value="" disabled selected>{{ placeholder }}</option>
        <option
          v-for="opt in options"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>
      
      <!-- Icono de flecha personalizado -->
      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>

    <p v-if="error" class="text-xs font-medium text-rose-600">
      {{ error }}
    </p>
  </div>
</template>
