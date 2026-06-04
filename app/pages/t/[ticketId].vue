<script setup lang="ts">
definePageMeta({ layout: 'public' })

const route = useRoute()
const ticketId = route.params.ticketId as string
const pdfUrl = `/api/tickets/${ticketId}/pdf`
</script>

<template>
  <div class="space-y-6 text-center">
    <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
      <svg class="h-7 w-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>

    <div class="space-y-1">
      <h1 class="text-2xl font-bold tracking-tight">¡Registro confirmado!</h1>
      <p class="text-sm text-slate-500">
        Tu ticket está listo. Descárgalo y preséntalo en la entrada del evento.
      </p>
    </div>

    <div class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <p class="text-xs text-slate-400">Ticket</p>
      <p class="mb-4 break-all font-mono text-sm text-slate-700">{{ ticketId }}</p>
      <a
        :href="pdfUrl"
        target="_blank"
        rel="noopener"
        class="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
      >
        Descargar ticket (PDF)
      </a>
    </div>

    <p class="text-xs text-slate-400">
      Guarda este enlace: aquí podrás volver a descargar tu ticket.
    </p>
  </div>
</template>
