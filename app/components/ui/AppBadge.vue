<script setup lang="ts">
interface Props {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
}

withDefaults(defineProps<Props>(), {
  variant: 'neutral',
})
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border"
    :class="[
      variant === 'success' && 'bg-emerald-50 border-emerald-200 text-emerald-800',
      variant === 'warning' && 'bg-amber-50 border-amber-200 text-amber-800',
      variant === 'danger' && 'bg-rose-50 border-rose-200 text-rose-800',
      variant === 'info' && 'bg-blue-50 border-blue-200 text-blue-800',
      variant === 'neutral' && 'bg-slate-100 border-slate-200 text-slate-800',
    ]"
  >
    <slot />
  </span>
</template>
