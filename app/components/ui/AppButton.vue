<script setup lang="ts">
interface Props {
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'warning'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  type: 'button',
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
    :class="[
      // Variantes de estilo
      variant === 'primary' && 'bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-950 shadow-sm',
      variant === 'secondary' && 'bg-slate-100 text-slate-900 hover:bg-slate-200 focus:ring-slate-300',
      variant === 'outline' && 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-500 shadow-xs',
      variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm',
      variant === 'warning' && 'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500 shadow-sm',
      variant === 'ghost' && 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-200',
      
      // Tamaños
      size === 'sm' && 'px-3 py-1.5 text-xs',
      size === 'md' && 'px-4 py-2 text-sm',
      size === 'lg' && 'px-5 py-2.5 text-base',
    ]"
  >
    <!-- Icono de carga -->
    <svg
      v-if="loading"
      class="-ml-1 mr-2 h-4 w-4 animate-spin text-current"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
    <slot />
  </button>
</template>
