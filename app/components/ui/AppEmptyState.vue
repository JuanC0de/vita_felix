<script setup lang="ts">
interface Props {
  title: string
  description?: string
}

withDefaults(defineProps<Props>(), {
  description: '',
})
</script>

<template>
  <div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-350 bg-white px-6 py-12 text-center shadow-xs">
    <!-- Icono decorativo -->
    <div class="mb-4 rounded-full bg-slate-50 p-4 text-slate-400">
      <slot name="icon">
        <!-- SVG por defecto de lista vacía -->
        <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      </slot>
    </div>

    <!-- Título y descripción -->
    <h3 class="text-base font-semibold text-slate-900">{{ title }}</h3>
    <p v-if="description" class="mt-1 max-w-sm text-sm text-slate-500">
      {{ description }}
    </p>

    <!-- Botón de acción -->
    <div v-if="$slots.action" class="mt-6">
      <slot name="action" />
    </div>
  </div>
</template>
