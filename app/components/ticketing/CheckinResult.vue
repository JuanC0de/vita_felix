<script setup lang="ts">
import type { CheckinResult } from '~/types/ticketing'

const props = defineProps<{ result: CheckinResult }>()

const REASONS: Record<string, string> = {
  signature: 'Código no auténtico (firma inválida).',
  expired: 'Código expirado.',
  malformed: 'Código ilegible.',
  void: 'Ticket anulado.',
  event_cancelled: 'El evento fue cancelado.',
  not_found: 'Ticket no encontrado o de otra organización.',
}

const view = computed(() => {
  const r = props.result
  if (r.status === 'admitted') {
    return {
      tone: 'admitted' as const,
      title: 'Acceso permitido',
      detail: `${r.attendee.fullName} · ${r.attendee.tierName}`,
    }
  }
  if (r.status === 'already_used') {
    const when = r.usedAt ? new Date(r.usedAt).toLocaleString('es-CO') : ''
    return { tone: 'used' as const, title: 'Ticket ya utilizado', detail: when ? `Usado el ${when}` : '' }
  }
  return { tone: 'invalid' as const, title: 'Ticket no válido', detail: REASONS[r.reason] ?? '' }
})

const styles = {
  admitted: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  used: 'border-amber-300 bg-amber-50 text-amber-800',
  invalid: 'border-rose-300 bg-rose-50 text-rose-800',
}
</script>

<template>
  <div class="rounded-lg border px-5 py-4" :class="styles[view.tone]">
    <p class="text-lg font-bold">{{ view.title }}</p>
    <p v-if="view.detail" class="mt-1 text-sm">{{ view.detail }}</p>
  </div>
</template>
