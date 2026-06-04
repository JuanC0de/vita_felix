<script setup lang="ts">
import type { EventCreate } from '~/types/events'

definePageMeta({ requiredRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER'] })

const { create } = useEvents()
const loading = ref(false)
const serverError = ref('')

async function onSubmit(payload: EventCreate) {
  loading.value = true
  serverError.value = ''
  try {
    const created = await create(payload)
    await navigateTo(`/events/${created.id}`)
  } catch {
    serverError.value = 'No se pudo crear el evento. Verifica los datos e inténtalo de nuevo.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="max-w-xl space-y-4">
    <div class="flex items-center gap-2 text-sm text-slate-500">
      <NuxtLink to="/events" class="hover:underline">Eventos</NuxtLink>
      <span>/</span>
      <span class="text-slate-700">Nuevo</span>
    </div>
    <h1 class="text-2xl font-bold tracking-tight">Crear evento</h1>

    <p v-if="serverError" class="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {{ serverError }}
    </p>

    <EventsEventForm :loading="loading" submit-label="Crear evento" @submit="onSubmit" />
  </section>
</template>
