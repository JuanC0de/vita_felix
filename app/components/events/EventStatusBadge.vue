<script setup lang="ts">
import type { EventStatus } from '~/types/events'

const props = defineProps<{ status: EventStatus }>()

const META: Record<EventStatus, { label: string; classes: string }> = {
  draft: { label: 'Borrador', classes: 'bg-slate-100 text-slate-700' },
  published: { label: 'Publicado', classes: 'bg-emerald-100 text-emerald-700' },
  finished: { label: 'Finalizado', classes: 'bg-sky-100 text-sky-700' },
  cancelled: { label: 'Cancelado', classes: 'bg-rose-100 text-rose-700' },
}

const meta = computed(() => META[props.status])
</script>

<template>
  <span :class="['inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', meta.classes]">
    {{ meta.label }}
  </span>
</template>
