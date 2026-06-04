<script setup lang="ts">
definePageMeta({ requiredRoles: ['SUPER_ADMIN'] })

const { data: dashboard, pending, error } = await useAsyncData('dashboard:global', () => 
  $fetch<any>('/api/dashboard')
)

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
      title="Centro de control global"
      subtitle="Supervisión analítica de la infraestructura SaaS, empresas, eventos y accesos."
    />

    <div v-if="pending" class="text-center py-12 text-slate-500">
      Cargando analíticas globales...
    </div>
    <div v-else-if="error || !dashboard" class="text-center py-12 text-rose-600">
      No se pudieron cargar las analíticas globales.
    </div>

    <div v-else class="space-y-6">
      <!-- KPIs de primer nivel -->
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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

      <!-- Sección de Alertas Operativas -->
      <div v-if="dashboard.alerts && dashboard.alerts.length > 0" class="space-y-3">
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

      <!-- Layout de Dos Columnas: Actividad Reciente y Gráficas de Referencia -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- Actividad Reciente -->
        <AppCard>
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

        <!-- Distribución Visual Decorativa -->
        <AppCard>
          <template #header>
            <h3 class="font-bold text-slate-900">Operaciones de acceso</h3>
          </template>
          <div class="space-y-4 py-3">
            <div class="space-y-1">
              <div class="flex justify-between text-xs font-semibold text-slate-700">
                <span>Eficiencia del ingreso en puerta</span>
                <span>{{ dashboard.kpis.averageOccupancy }}%</span>
              </div>
              <AppProgressBar :value="dashboard.kpis.averageOccupancy" variant="primary" />
            </div>
            <div class="text-xs text-slate-500 leading-relaxed pt-2">
              <p class="font-bold text-slate-700 mb-1">Métrica de Ocupación:</p>
              Esta métrica representa el aforo ingresado de forma acumulada en todos los eventos gestionados. Una tasa ideal se sitúa entre el 70% y el 90%.
            </div>
          </div>
        </AppCard>
      </div>
    </div>
  </div>
</template>
