<script setup lang="ts">
definePageMeta({ requiredRoles: ['SUPER_ADMIN'] })

const { authContext } = useAuth()

const tenantKey = computed(() => authContext.value?.companyId ?? 'global')

const { data: dashboard, pending, error, refresh } = await useAsyncData(
  'dashboard:admin',
  () => $fetch<any>('/api/dashboard'),
)

watch(tenantKey, () => refresh())

const { data: myCompanies } = await useAsyncData('auth:my-companies', () =>
  $fetch<any[]>('/api/auth/my-companies').catch(() => []),
)

const currentCompany = computed(() => {
  return myCompanies.value?.find((c: any) => c.id === authContext.value?.companyId)
})

function fmtMoney(amount: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="space-y-6">
    <!-- AppPageHeader -->
    <AppPageHeader
      :title="dashboard?.type === 'company' ? `Centro de control: ${currentCompany?.name || 'Organización'}` : 'Centro de control global'"
      :subtitle="dashboard?.type === 'company' ? 'Analíticas operativas de la organización seleccionada.' : 'Supervisión analítica de la infraestructura SaaS, empresas, eventos y accesos.'"
    />

    <div v-if="pending" class="text-center py-12 text-slate-500">
      Cargando analíticas...
    </div>
    <div v-else-if="error || !dashboard" class="text-center py-12 text-rose-600">
      No se pudieron cargar las analíticas.
    </div>

    <div v-else class="space-y-6">
      <!-- KPIs de primer nivel para empresa -->
      <div v-if="dashboard.type === 'company'" class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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

      <!-- KPIs de primer nivel para global -->
      <div v-else class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <AppStatCard
          title="Empresas Activas"
          :value="dashboard.kpis.activeCompanies"
          subtext="Empresas con membresía activa"
        />
        <AppStatCard
          title="Eventos Publicados"
          :value="dashboard.kpis.publishedEvents"
          subtext="Disponibles para registro"
        />
        <AppStatCard
          title="Ingresos Estimados"
          :value="fmtMoney(dashboard.kpis.estimatedRevenue)"
          subtext="Facturación estimada del mes"
          trend="up"
          trend-value="COP"
        />
        <AppStatCard
          title="Tickets Emitidos"
          :value="dashboard.kpis.issuedTickets"
          subtext="Total boletas generadas"
        />
        <AppStatCard
          title="Tickets Validados"
          :value="dashboard.kpis.validatedTickets"
          subtext="Ingresaron a eventos"
        />
        <AppStatCard
          title="Ocupación Promedio"
          :value="`${dashboard.kpis.averageOccupancy}%`"
          subtext="Tasa de asistencia general"
        />
      </div>

      <!-- Sección de Alertas Operativas (solo para Global) -->
      <div v-if="dashboard.type === 'global' && dashboard.alerts && dashboard.alerts.length > 0" class="space-y-3">
        <h3 class="text-sm font-bold uppercase tracking-wider text-slate-500">
          Alertas Operativas
        </h3>
        <div class="grid grid-cols-1 gap-3">
          <div
            v-for="(al, idx) in dashboard.alerts"
            :key="idx"
            class="rounded-xl border p-4 text-xs font-semibold flex items-center gap-3 shadow-xs"
            :class="[
              al.type === 'danger' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800'
            ]"
          >
            <span class="flex h-2 w-2 rounded-full shrink-0" :class="al.type === 'danger' ? 'bg-red-600' : 'bg-amber-600'" />
            <p>{{ al.text }}</p>
          </div>
        </div>
      </div>

      <!-- Layout de Dos Columnas: Actividad Reciente / Próximo Evento y Control de Asistencia -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- Próximo Evento (Empresa) -->
        <AppCard v-if="dashboard.type === 'company'">
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

        <!-- Actividad Reciente (Global) -->
        <AppCard v-else>
          <template #header>
            <h3 class="font-bold text-slate-900">Actividad reciente</h3>
          </template>
          <div v-if="dashboard.recentActivity.length === 0" class="text-center py-6 text-sm text-slate-400">
            Sin actividad registrada recientemente.
          </div>
          <ul v-else class="divide-y divide-slate-100">
            <li v-for="(act, idx) in dashboard.recentActivity" :key="idx" class="py-3 flex justify-between items-start text-xs">
              <div class="space-y-1">
                <div class="flex items-center gap-1.5 font-semibold text-slate-900">
                  <span
                    class="h-1.5 w-1.5 rounded-full"
                    :class="act.type === 'event' ? 'bg-violet-600' : 'bg-emerald-600'"
                  />
                  {{ act.label }}
                </div>
                <p class="text-slate-500 pl-3">{{ act.subtext }}</p>
              </div>
              <span class="text-slate-400 font-medium">{{ formatDate(act.time) }}</span>
            </li>
          </ul>
        </AppCard>

        <!-- Distribución Visual Decorativa / Asistencia -->
        <AppCard>
          <template #header>
            <h3 class="font-bold text-slate-900">
              {{ dashboard.type === 'company' ? 'Control de asistencia en puerta' : 'Operaciones de acceso' }}
            </h3>
          </template>
          <div class="space-y-4 py-3">
            <div class="space-y-1">
              <div class="flex justify-between text-xs font-semibold text-slate-700">
                <span>
                  {{ dashboard.type === 'company' ? 'Asistencia acumulada' : 'Eficiencia del ingreso en puerta' }}
                </span>
                <span>{{ dashboard.kpis.averageOccupancy }}%</span>
              </div>
              <AppProgressBar :value="dashboard.kpis.averageOccupancy" variant="primary" />
            </div>
            <div class="text-xs text-slate-500 leading-relaxed pt-2">
              <p class="font-bold text-slate-700 mb-1">
                {{ dashboard.type === 'company' ? 'Nota operativa:' : 'Métrica de Ocupación:' }}
              </p>
              <template v-if="dashboard.type === 'company'">
                Este porcentaje compara el total de check-ins exitosos contra las entradas totales emitidas. Te ayuda a estimar los tiempos de ingreso en tus eventos.
              </template>
              <template v-else>
                Esta métrica representa el aforo ingresado de forma acumulada en todos los eventos gestionados. Una tasa ideal se sitúa entre el 70% y el 90%.
              </template>
            </div>
          </div>
        </AppCard>
      </div>
    </div>
  </div>
</template>
