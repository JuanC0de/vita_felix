<script setup lang="ts">
definePageMeta({ middleware: 'home-redirect' })

const { authContext } = useAuth()

const tenantKey = computed(() => authContext.value?.companyId ?? 'global')

const { data: dashboard, pending, error, refresh } = await useAsyncData(
  'dashboard:company',
  () => $fetch<any>('/api/dashboard'),
)

watch(tenantKey, () => refresh())

function fmtMoney(amount: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader
      title="Centro de control corporativo"
      subtitle="Analíticas operativas del rendimiento de taquilla, aforo e ingresos de tu organización."
    />

    <div v-if="pending" class="text-center py-12 text-slate-500">
      Cargando analíticas corporativas...
    </div>
    <div v-else-if="error || !dashboard || dashboard.error" class="text-center py-12 text-rose-600">
      {{ dashboard?.error || 'No se pudieron cargar las analíticas corporativas.' }}
    </div>

    <div v-else class="space-y-6">
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <AppStatCard
          title="Eventos Activos"
          :value="dashboard.kpis.activeEvents"
          subtext="Eventos en venta/publicados"
        />
        <AppStatCard
          title="Tickets Vendidos"
          :value="dashboard.kpis.issuedTickets"
          subtext="Total emisiones"
        />
        <AppStatCard
          title="Ingresos Estimados"
          :value="fmtMoney(dashboard.kpis.estimatedRevenue)"
          subtext="Recaudación bruta"
          trend="up"
          trend-value="COP"
        />
        <AppStatCard
          title="Ocupación Promedio"
          :value="`${dashboard.kpis.averageOccupancy}%`"
          subtext="Asistencia en puerta"
        />
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AppCard>
          <template #header>
            <h3 class="font-bold text-slate-900">Próximo evento programado</h3>
          </template>
          <div v-if="!dashboard.kpis.nextEvent" class="text-center py-8 text-sm text-slate-400">
            No hay eventos futuros programados.
          </div>
          <div v-else class="space-y-4 py-2">
            <div>
              <h4 class="text-lg font-bold text-slate-900">{{ dashboard.kpis.nextEvent.name }}</h4>
              <p class="text-xs text-slate-500 mt-0.5">Lugar: {{ dashboard.kpis.nextEvent.venue }}</p>
            </div>
            <div class="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-600 flex justify-between">
              <span>Fecha y hora:</span>
              <span class="font-bold">{{ formatDate(dashboard.kpis.nextEvent.date) }}</span>
            </div>
            <div class="pt-2">
              <NuxtLink :to="`/events`">
                <AppButton size="sm" class="w-full">Gestionar eventos</AppButton>
              </NuxtLink>
            </div>
          </div>
        </AppCard>

        <AppCard>
          <template #header>
            <h3 class="font-bold text-slate-900">Control de asistencia en puerta</h3>
          </template>
          <div class="space-y-4 py-3">
            <div class="space-y-1">
              <div class="flex justify-between text-xs font-semibold text-slate-700">
                <span>Asistencia acumulada</span>
                <span>{{ dashboard.kpis.averageOccupancy }}%</span>
              </div>
              <AppProgressBar :value="dashboard.kpis.averageOccupancy" variant="primary" />
            </div>
            <div class="text-xs text-slate-500 leading-relaxed pt-2">
              <p class="font-bold text-slate-700 mb-1">Nota operativa:</p>
              Este porcentaje compara el total de check-ins exitosos contra las entradas totales emitidas. Te ayuda a estimar los tiempos de ingreso en tus eventos.
            </div>
          </div>
        </AppCard>
      </div>
    </div>
  </div>
</template>
