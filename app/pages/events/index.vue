<script setup lang="ts">
import type { AppRole } from '~/types/auth'

const MANAGE_ROLES: AppRole[] = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER']

definePageMeta({ requiredRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER'] })

const { list } = useEvents()
const { can } = useAuthorization()
const { authContext } = useAuth()

const tenantKey = computed(() => authContext.value?.companyId ?? 'global')

const { data: events, pending, error, refresh } = await useAsyncData(
  'events:list',
  () => list(),
)

watch(tenantKey, () => refresh())

const search = ref('')
const statusFilter = ref('')

const filteredEvents = computed(() => {
  if (!events.value) return []
  return events.value.filter((ev) => {
    const matchesSearch = ev.name.toLowerCase().includes(search.value.toLowerCase()) || 
                          ev.venue.toLowerCase().includes(search.value.toLowerCase())
    const matchesStatus = !statusFilter.value || ev.status === statusFilter.value
    return matchesSearch && matchesStatus
  })
})

const stats = computed(() => {
  const list = events.value ?? []
  return {
    total: list.length,
    published: list.filter(e => e.status === 'published').length,
    draft: list.filter(e => e.status === 'draft').length,
  }
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' })
}

const statusOptions = [
  { value: 'draft', label: 'Borrador' },
  { value: 'published', label: 'Publicado' },
  { value: 'finished', label: 'Finalizado' },
  { value: 'cancelled', label: 'Cancelado' },
]

const showConfirmDelete = ref(false)
const selectedEventId = ref('')
const selectedEventName = ref('')
const deleteLoading = ref(false)

function openDeleteModal(ev: any) {
  selectedEventId.value = ev.id
  selectedEventName.value = ev.name
  showConfirmDelete.value = true
}

async function onConfirmDelete() {
  deleteLoading.value = true
  try {
    await $fetch(`/api/events/${selectedEventId.value}`, { method: 'DELETE' })
    showConfirmDelete.value = false
    await refresh()
  } catch {
    alert('No se pudo eliminar el evento.')
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- AppPageHeader -->
    <AppPageHeader
      title="Eventos musicales"
      subtitle="Lista de espectáculos y eventos de la organización."
    >
      <template #actions>
        <NuxtLink v-if="can(MANAGE_ROLES)" to="/events/new">
          <AppButton size="md">Crear evento</AppButton>
        </NuxtLink>
      </template>
    </AppPageHeader>

    <!-- Resumen de Métricas -->
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
      <AppStatCard
        title="Eventos Totales"
        :value="stats.total"
        subtext="Registrados en la cuenta"
      />
      <AppStatCard
        title="Eventos Publicados"
        :value="stats.published"
        subtext="Visibles para registro"
        trend="up"
        trend-value="OK"
      />
      <AppStatCard
        title="Borradores"
        :value="stats.draft"
        subtext="En configuración"
      />
    </div>

    <!-- Filtros -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
      <div class="flex-1 max-w-sm">
        <AppInput
          v-model="search"
          placeholder="Buscar por nombre o lugar..."
        />
      </div>
      <div class="w-full sm:w-48">
        <AppSelect
          v-model="statusFilter"
          placeholder="Todos los estados"
          :options="statusOptions"
        />
      </div>
    </div>

    <!-- Contenido Principal -->
    <div v-if="pending" class="text-center py-12 text-slate-500">
      Cargando eventos...
    </div>
    <div v-else-if="error" class="text-center py-12 text-rose-600">
      No se pudieron cargar los eventos.
    </div>
    <div v-else-if="filteredEvents.length === 0" class="py-4">
      <AppEmptyState
        title="No se encontraron eventos"
        description="Empieza a comercializar tus conciertos creando tu primer evento."
      >
        <template #action>
          <NuxtLink to="/events/new">
            <AppButton size="sm">Crear primer evento</AppButton>
          </NuxtLink>
        </template>
      </AppEmptyState>
    </div>

    <AppTable v-else>
      <template #headers>
        <th class="px-6 py-3">Nombre del evento</th>
        <th class="px-6 py-3">Fecha y Hora</th>
        <th class="px-6 py-3">Ubicación / Lugar</th>
        <th class="px-6 py-3">Estado</th>
        <th class="px-6 py-3" />
      </template>
      
      <tr
        v-for="ev in filteredEvents"
        :key="ev.id"
        class="hover:bg-slate-50/75 transition-colors"
      >
        <td class="px-6 py-4">
          <div class="flex items-center gap-3">
            <!-- Icono visual decorativo basado en gradientes -->
            <div class="h-10 w-10 rounded-lg bg-gradient-to-tr from-violet-600 to-blue-600 flex items-center justify-center font-bold text-white shrink-0 shadow-sm">
              🎵
            </div>
            <div>
              <p class="font-bold text-slate-900 leading-none mb-1">{{ ev.name }}</p>
              <p class="text-xs text-slate-500">ID: {{ ev.id.substring(0, 8) }}</p>
            </div>
          </div>
        </td>
        
        <td class="px-6 py-4 text-xs font-semibold text-slate-700">
          {{ formatDate(ev.eventAt) }}
        </td>

        <td class="px-6 py-4 text-xs text-slate-600">
          {{ ev.venue }}
        </td>

        <td class="px-6 py-4">
          <EventsEventStatusBadge :status="ev.status" />
        </td>

        <td class="px-6 py-4 text-right">
          <!-- Menú de Acciones Desplegable (AppDropdownMenu) -->
          <AppDropdownMenu>
            <div class="flex flex-col">
              <NuxtLink
                :to="`/events/${ev.id}/dashboard`"
                class="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
              >
                📊 Dashboard
              </NuxtLink>
              <NuxtLink
                :to="`/events/${ev.id}`"
                class="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
              >
                ⚙️ Configuración
              </NuxtLink>
              <NuxtLink
                :to="`/events/${ev.id}/tickets`"
                class="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
              >
                🎟️ Boletería
              </NuxtLink>
              <NuxtLink
                :to="`/events/${ev.id}/attendees`"
                class="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
              >
                👥 Asistentes
              </NuxtLink>
              <button
                type="button"
                class="w-full text-left px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 border-t border-slate-100 mt-1 cursor-pointer"
                @click="openDeleteModal(ev)"
              >
                🗑️ Eliminar
              </button>
            </div>
          </AppDropdownMenu>
        </td>
      </tr>
    </AppTable>

    <!-- Modal de confirmación para eliminar evento -->
    <AppConfirmModal
      :show="showConfirmDelete"
      title="Eliminar evento"
      :message="`¿Estás seguro de que deseas eliminar el evento '${selectedEventName}'? Esta acción no se puede deshacer y borrará toda la información relacionada en cascada.`"
      confirm-text="Eliminar permanentemente"
      variant="danger"
      :loading="deleteLoading"
      @confirm="onConfirmDelete"
      @cancel="showConfirmDelete = false"
    />
  </div>
</template>
