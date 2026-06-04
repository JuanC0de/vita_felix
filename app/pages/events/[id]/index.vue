<script setup lang="ts">
import type { AppRole } from '~/types/auth'
import type { EventCreate, StatusAction } from '~/types/events'

definePageMeta({ requiredRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER'] })

const DELETE_ROLES: AppRole[] = ['SUPER_ADMIN', 'COMPANY_ADMIN']

const route = useRoute()
const id = route.params.id as string

const { get, update, remove, setStatus } = useEvents()
const { can } = useAuthorization()

const { data: ev, refresh } = await useAsyncData(`events:${id}`, () => get(id))

const loading = ref(false)
const actionError = ref('')

/** Acciones de estado disponibles según el estado actual. */
const availableActions = computed<Array<{ action: StatusAction; label: string }>>(() => {
  switch (ev.value?.status) {
    case 'draft':
      return [
        { action: 'publish', label: 'Publicar evento' },
        { action: 'cancel', label: 'Cancelar evento' },
      ]
    case 'published':
      return [
        { action: 'finish', label: 'Finalizar ventas' },
        { action: 'cancel', label: 'Cancelar evento' },
      ]
    default:
      return []
  }
})

async function onSubmit(payload: EventCreate) {
  loading.value = true
  actionError.value = ''
  try {
    await update(id, payload)
    await refresh()
  } catch {
    actionError.value = 'No se pudo actualizar el evento.'
  } finally {
    loading.value = false
  }
}

async function onStatus(action: StatusAction) {
  loading.value = true
  actionError.value = ''
  try {
    await setStatus(id, action)
    await refresh()
  } catch (e) {
    const data = (e as { data?: { message?: string } })?.data
    actionError.value = data?.message ?? 'No se pudo cambiar el estado del evento.'
  } finally {
    loading.value = false
  }
}

async function onDelete() {
  if (!confirm('¿Eliminar este evento y todas sus etapas de boletería?')) return
  loading.value = true
  actionError.value = ''
  try {
    await remove(id)
    await navigateTo('/events')
  } catch {
    actionError.value = 'No se pudo eliminar el evento.'
    loading.value = false
  }
}
</script>

<template>
  <EventsEventHeaderShell
    v-if="ev"
    :id="id"
    active-tab="resumen"
    :event-name="ev.name"
    :event-status="ev.status"
  >
    <div class="max-w-2xl space-y-6">
      <p v-if="actionError" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 font-medium">
        {{ actionError }}
      </p>

      <!-- Botones de Transición de Estado -->
      <div class="flex flex-wrap items-center gap-2 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <AppButton
          v-for="a in availableActions"
          :key="a.action"
          :disabled="loading"
          variant="secondary"
          size="sm"
          @click="onStatus(a.action)"
        >
          {{ a.label }}
        </AppButton>
        
        <AppButton
          v-if="can(DELETE_ROLES)"
          :disabled="loading"
          variant="danger"
          size="sm"
          @click="onDelete"
        >
          Eliminar evento
        </AppButton>
      </div>

      <!-- Formulario de Edición -->
      <AppCard>
        <template #header>
          <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-500">Detalles de Configuración</h2>
        </template>
        <EventsEventForm
          :event-id="id"
          :initial="{ name: ev.name, venue: ev.venue, eventAt: ev.eventAt, description: ev.description, flyerUrl: ev.flyerUrl }"
          :loading="loading"
          submit-label="Guardar cambios"
          @submit="onSubmit"
        />
      </AppCard>
    </div>
  </EventsEventHeaderShell>
</template>
