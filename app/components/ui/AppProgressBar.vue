<script setup lang="ts">
interface Props {
  value: number // de 0 a 100 o valor absoluto si se provee max
  max?: number
  variant?: 'primary' | 'success' | 'warning' | 'danger'
  showText?: boolean
  textPosition?: 'inside' | 'outside'
}

const props = withDefaults(defineProps<Props>(), {
  max: 100,
  variant: 'primary',
  showText: false,
  textPosition: 'outside',
})

const percentage = computed(() => {
  if (props.max <= 0) return 0
  const pct = (props.value / props.max) * 100
  return Math.min(100, Math.max(0, Math.round(pct)))
})
</script>

<template>
  <div class="w-full">
    <!-- Texto exterior superior -->
    <div
      v-if="showText && textPosition === 'outside'"
      class="mb-1 flex justify-between text-xs font-medium text-slate-600"
    >
      <span><slot name="label" /></span>
      <span>{{ percentage }}%</span>
    </div>

    <!-- Contenedor de la barra -->
    <div class="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        class="h-full rounded-full transition-all duration-500 ease-out"
        :class="[
          variant === 'primary' && 'bg-slate-900',
          variant === 'success' && 'bg-emerald-500',
          variant === 'warning' && 'bg-amber-500',
          variant === 'danger' && 'bg-rose-500',
        ]"
        :style="{ width: `${percentage}%` }"
      >
        <!-- Texto interior (si la barra es lo suficientemente alta) -->
        <span
          v-if="showText && textPosition === 'inside'"
          class="block pr-2 text-right text-[10px] font-bold text-white leading-none"
        >
          {{ percentage }}%
        </span>
      </div>
    </div>
  </div>
</template>
