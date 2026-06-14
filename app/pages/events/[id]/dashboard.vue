<script setup lang="ts">
definePageMeta({ requiredRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER'] })

const route = useRoute()
const id = route.params.id as string

const { data: dashboard, pending, error, refresh } = await useAsyncData(`events:${id}:dashboard`, () => 
  $fetch<any>(`/api/events/${id}/dashboard`)
)

const { setStatus } = useEvents()
const statusLoading = ref(false)

async function changeStatus(action: 'publish' | 'finish' | 'cancel') {
  statusLoading.value = true
  try {
    await setStatus(id, action)
    await refresh()
  } catch (err: any) {
    alert(err.data?.message || 'No se pudo cambiar el estado del evento.')
  } finally {
    statusLoading.value = false
  }
}

function fmtMoney(amount: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })
}
</script>

<template>
  <div class="space-y-6">
    <div v-if="pending" class="text-center py-12 text-slate-500">
      Cargando analíticas del evento...
    </div>
    <div v-else-if="error || !dashboard" class="text-center py-12 text-rose-600">
      No se pudieron cargar las analíticas del evento.
    </div>

    <div v-else class="space-y-6">
      <!-- AppPageHeader -->
      <AppPageHeader
        :title="`Dashboard: ${dashboard?.event?.name || ''}`"
        :subtitle="`Métricas y operaciones en vivo para el evento en ${dashboard?.event?.venue || ''}.`"
        :breadcrumbs="[
          { label: 'Eventos', to: '/events' },
          { label: dashboard?.event?.name || 'Evento', to: `/events/${id}` },
          { label: 'Dashboard' }
        ]"
      />

      <!-- KPIs del Evento -->
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <AppStatCard
          title="Ingresos Estimados"
          :value="fmtMoney(dashboard?.metrics?.estimatedRevenue ?? 0)"
          subtext="Recaudación total estimada"
          trend="up"
          trend-value="COP"
        />
        <AppStatCard
          title="Porcentaje de Ingreso"
          :value="`${dashboard?.metrics?.doorEntryPct ?? 0}%`"
          subtext="Asistentes validados"
        />
        <AppStatCard
          title="Capacidad Total"
          :value="dashboard?.metrics?.capacityTotal ?? 0"
          subtext="Cupo total sumando etapas"
        />
        <AppStatCard
          title="Tickets Emitidos"
          :value="dashboard?.metrics?.ticketsIssued ?? 0"
          subtext="Boletas vendidas/emitidas"
        />
        <AppStatCard
          title="Tickets Disponibles"
          :value="dashboard?.metrics?.ticketsAvailable ?? 0"
          subtext="Aforo restante disponible"
        />
        <AppStatCard
          title="Tickets Usados"
          :value="dashboard?.metrics?.ticketsUsed ?? 0"
          subtext="Validados en portería"
        />
      </div>

      <!-- Fila Intermedia: Ventas por Etapa y Acciones Rápidas -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- Ventas por Etapa (Progress Bars) -->
        <AppCard>
          <template #header>
            <h3 class="font-bold text-slate-900">Ventas por etapa de boletería</h3>
          </template>
          <div v-if="!dashboard?.salesByTier || dashboard.salesByTier.length === 0" class="text-center py-8 text-sm text-slate-400">
            Este evento no tiene etapas de boletería configuradas.
          </div>
          <div v-else class="space-y-5 py-2">
            <div v-for="tier in dashboard.salesByTier" :key="tier.id" class="space-y-1">
              <div class="flex justify-between text-xs font-semibold text-slate-700">
                <div>
                  <span class="font-bold">{{ tier.name }}</span>
                  <span class="text-slate-400 font-normal ml-2">({{ fmtMoney(tier.price) }})</span>
                </div>
                <span>{{ tier.sold }} / {{ tier.quota }} vendidos</span>
              </div>
              <AppProgressBar :value="tier.sold" :max="tier.quota" variant="success" />
              <div class="flex justify-between text-[10px] text-slate-400">
                <span>Ingreso estimado: {{ fmtMoney(tier.revenue) }}</span>
                <span>Cupo disponible: {{ tier.available }}</span>
              </div>
            </div>
          </div>
        </AppCard>

        <!-- Acciones Rápidas -->
        <AppCard>
          <template #header>
            <h3 class="font-bold text-slate-900">Centro de operaciones del evento</h3>
          </template>
          <div class="grid grid-cols-2 gap-4 py-2">
            <!-- Configurar Boletería -->
            <NuxtLink :to="`/events/${id}/tickets`" class="flex flex-col items-center justify-center rounded-xl border border-slate-200 p-4 text-center hover:bg-slate-50 transition-colors shadow-xs">
              <span class="rounded-full bg-slate-100 p-3 text-slate-700 mb-2">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </span>
              <span class="text-xs font-semibold text-slate-800">Configurar boletería</span>
            </NuxtLink>

            <!-- Ver Asistentes -->
            <NuxtLink :to="`/events/${id}/attendees`" class="flex flex-col items-center justify-center rounded-xl border border-slate-200 p-4 text-center hover:bg-slate-50 transition-colors shadow-xs">
              <span class="rounded-full bg-slate-100 p-3 text-slate-700 mb-2">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </span>
              <span class="text-xs font-semibold text-slate-800">Ver asistentes</span>
            </NuxtLink>

            <!-- Control de acceso QR -->
            <NuxtLink :to="`/scan`" class="flex flex-col items-center justify-center rounded-xl border border-slate-200 p-4 text-center hover:bg-slate-50 transition-colors shadow-xs">
              <span class="rounded-full bg-slate-100 p-3 text-slate-700 mb-2">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </span>
              <span class="text-xs font-semibold text-slate-800">Control de acceso QR</span>
            </NuxtLink>

            <!-- Acciones de Ciclo de Vida -->
            <div class="flex flex-col items-center justify-center rounded-xl border border-slate-200 p-4 text-center shadow-xs">
              <span class="text-xs font-bold text-slate-500 mb-2">Acción de estado</span>
              
              <!-- Publicar si está en borrador -->
              <AppButton
                v-if="dashboard?.event?.status === 'draft'"
                size="sm"
                :loading="statusLoading"
                @click="changeStatus('publish')"
              >
                Publicar
              </AppButton>
              <!-- Finalizar si está publicado -->
              <AppButton
                v-else-if="dashboard?.event?.status === 'published'"
                size="sm"
                :loading="statusLoading"
                @click="changeStatus('finish')"
              >
                Finalizar
              </AppButton>
              <span v-else class="text-xs font-bold uppercase text-slate-400">
                {{ dashboard?.event?.status }}
              </span>
            </div>
          </div>
        </AppCard>
      </div>
    </div>
  </div>
</template>
