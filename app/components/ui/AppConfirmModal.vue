<script setup lang="ts">
interface Props {
  show: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  loading?: boolean
  variant?: 'danger' | 'primary'
}

withDefaults(defineProps<Props>(), {
  confirmText: 'Confirmar',
  cancelText: 'Cancelar',
  loading: false,
  variant: 'primary',
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <!-- Fondo translúcido -->
      <div
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
        @click="!loading && emit('cancel')"
      />

      <!-- Contenedor del Modal -->
      <div
        class="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all duration-300 scale-100 border border-slate-100"
      >
        <div class="flex items-start gap-4">
          <!-- Icono de advertencia/peligro -->
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            :class="[
              variant === 'danger' ? 'bg-red-55 text-red-600' : 'bg-blue-55 text-blue-600'
            ]"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <!-- Título y mensaje -->
          <div class="space-y-1">
            <h3 class="text-base font-bold text-slate-900">{{ title }}</h3>
            <p class="text-sm text-slate-500">{{ message }}</p>
          </div>
        </div>

        <!-- Botones de Acción -->
        <div class="mt-6 flex justify-end gap-3">
          <AppButton
            variant="outline"
            :disabled="loading"
            @click="emit('cancel')"
          >
            {{ cancelText }}
          </AppButton>
          <AppButton
            :variant="variant === 'danger' ? 'danger' : 'primary'"
            :loading="loading"
            @click="emit('confirm')"
          >
            {{ confirmText }}
          </AppButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>
