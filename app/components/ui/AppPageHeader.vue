<script setup lang="ts">
interface Breadcrumb {
  label: string
  to?: string
}

interface Props {
  title: string
  subtitle?: string
  breadcrumbs?: Breadcrumb[]
}

withDefaults(defineProps<Props>(), {
  subtitle: '',
  breadcrumbs: () => [],
})
</script>

<template>
  <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="space-y-1.5">
      <!-- Migas de pan (Breadcrumbs) -->
      <nav v-if="breadcrumbs.length > 0" class="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
        <div v-for="(bc, index) in breadcrumbs" :key="index" class="flex items-center gap-1.5">
          <NuxtLink
            v-if="bc.to"
            :to="bc.to"
            class="hover:text-slate-800 hover:underline"
          >
            {{ bc.label }}
          </NuxtLink>
          <span v-else class="text-slate-700">{{ bc.label }}</span>
          <span v-if="index < breadcrumbs.length - 1" class="text-slate-400">/</span>
        </div>
      </nav>
      
      <!-- Título y Subtítulo -->
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {{ title }}
        </h1>
        <p v-if="subtitle" class="mt-1 text-sm text-slate-500">
          {{ subtitle }}
        </p>
      </div>
    </div>
    
    <!-- Ranura para botones/acciones -->
    <div v-if="$slots.actions" class="flex items-center gap-3">
      <slot name="actions" />
    </div>
  </div>
</template>
