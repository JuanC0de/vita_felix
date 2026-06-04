<script setup lang="ts">
interface Props {
  title: string
  value: string | number
  subtext?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  subtext: '',
  trend: 'neutral',
  trendValue: '',
  loading: false,
})
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
    <div v-if="loading" class="animate-pulse space-y-3">
      <div class="h-4 w-24 rounded-sm bg-slate-200" />
      <div class="h-8 w-32 rounded-sm bg-slate-200" />
      <div class="h-3 w-40 rounded-sm bg-slate-200" />
    </div>
    
    <div v-else class="flex items-start justify-between">
      <div class="space-y-1">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {{ title }}
        </p>
        <p class="text-2xl font-bold tracking-tight text-slate-900">
          {{ value }}
        </p>
        
        <div class="flex items-center gap-1.5 pt-0.5">
          <span
            v-if="trendValue"
            class="inline-flex items-center text-xs font-semibold"
            :class="[
              trend === 'up' && 'text-emerald-600',
              trend === 'down' && 'text-rose-600',
              trend === 'neutral' && 'text-slate-500',
            ]"
          >
            <!-- Flecha Arriba -->
            <svg
              v-if="trend === 'up'"
              class="mr-0.5 h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <!-- Flecha Abajo -->
            <svg
              v-if="trend === 'down'"
              class="mr-0.5 h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            {{ trendValue }}
          </span>
          <span v-if="subtext" class="text-xs text-slate-500">{{ subtext }}</span>
        </div>
      </div>
      
      <!-- Ranura para iconos -->
      <div
        v-if="$slots.icon"
        class="rounded-lg bg-slate-50 p-3 text-slate-600"
      >
        <slot name="icon" />
      </div>
    </div>
  </div>
</template>
