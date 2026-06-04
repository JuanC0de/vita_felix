<script setup lang="ts">
interface Props {
  modelValue: string | number
  label?: string
  id?: string
  type?: string
  placeholder?: string
  error?: string
  required?: boolean
  disabled?: boolean
  autocomplete?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  placeholder: '',
  error: '',
  required: false,
  disabled: false,
  autocomplete: 'off',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputId = computed(() => props.id ?? `input-${Math.random().toString(36).substr(2, 9)}`)

function onInput(e: Event) {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="space-y-1">
    <label
      v-if="label"
      :for="inputId"
      class="block text-sm font-medium text-slate-700"
    >
      {{ label }}
      <span v-if="required" class="text-rose-500">*</span>
    </label>
    
    <div class="relative">
      <input
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :autocomplete="autocomplete"
        class="w-full rounded-lg border px-3 py-2 text-sm font-normal text-slate-900 transition-colors duration-200 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
        :class="[
          error 
            ? 'border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500' 
            : 'border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900'
        ]"
        @input="onInput"
      >
    </div>
    
    <p v-if="error" class="text-xs font-medium text-rose-600">
      {{ error }}
    </p>
  </div>
</template>
