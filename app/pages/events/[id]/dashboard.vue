<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({ requiredRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER'] })

const route = useRoute()
const id = route.params.id as string

const { data: dashboard, pending, error, refresh } = await useAsyncData(`events:${id}:dashboard`, () => 
  $fetch<any>(`/api/events/${id}/dashboard`)
)

const { setStatus } = useEvents()
const statusLoading = ref(false)

const sessions = ref<any[]>([])
const loadingSessions = ref(false)

const selectedSession = ref<any | null>(null)
const selectedSessionSales = ref<any[]>([])
const selectedSessionTotals = ref<any>(null)
const loadingSales = ref(false)

const fetchSessions = async () => {
  try {
    loadingSessions.value = true
    const res = await $fetch<{ sessions: any[] }>(`/api/cash-sessions?eventId=${id}`)
    sessions.value = res.sessions
  } catch (err) {
    console.error('Error al cargar sesiones de caja en dashboard:', err)
  } finally {
    loadingSessions.value = false
  }
}

const viewSessionReport = async (session: any) => {
  selectedSession.value = session
  try {
    loadingSales.value = true
    selectedSessionSales.value = []
    selectedSessionTotals.value = null
    const res = await $fetch<{ sales: any[], totals: any }>(`/api/cash-sessions/${session.id}/sales`)
    selectedSessionSales.value = res.sales
    selectedSessionTotals.value = res.totals
  } catch (err) {
    console.error('Error al cargar ventas de la sesión:', err)
    alert('No se pudieron cargar los detalles de venta de esta sesión')
  } finally {
    loadingSales.value = false
  }
}

const closeSessionReport = () => {
  selectedSession.value = null
  selectedSessionSales.value = []
  selectedSessionTotals.value = null
}

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
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' })
}

const getDiff = (session: any) => {
  return (session.closingBalanceReal || 0) - (session.closingBalanceExpected || 0)
}

const getDiffSymbol = (session: any) => {
  const diff = getDiff(session)
  if (diff > 0) return '+'
  return ''
}

const getDiffClass = (session: any) => {
  const diff = getDiff(session)
  if (diff === 0) return 'text-emerald-600 font-semibold'
  if (diff > 0) return 'text-blue-600 font-semibold'
  return 'text-rose-600 font-black'
}

const formatDateShort = (isoString: string) => {
  return new Date(isoString).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

const formatDateDay = (isoString: string) => {
  return new Date(isoString).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit'
  })
}

const formatDateTime = (isoString: string) => {
  return new Date(isoString).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })
}

onMounted(async () => {
  await fetchSessions()
})

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
          title="Ingresos Totales (Est.)"
          :value="fmtMoney((dashboard?.metrics?.estimatedRevenue ?? 0))"
          subtext="Ventas totales registradas"
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
          title="Venta Puerta (Total)"
          :value="fmtMoney(dashboard?.metrics?.doorRevenueTotal ?? 0)"
          subtext="Recaudado físicamente en puerta"
        />
        <AppStatCard
          title="Puerta (Efectivo)"
          :value="fmtMoney(dashboard?.metrics?.doorRevenueCash ?? 0)"
          subtext="Efectivo en poder de taquilla"
        />
        <AppStatCard
          title="Puerta (Tarjeta)"
          :value="fmtMoney(dashboard?.metrics?.doorRevenueCard ?? 0)"
          subtext="Transado por datáfonos"
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

            <!-- Abrir Taquilla POS -->
            <NuxtLink :to="`/events/${id}/taquilla`" class="flex flex-col items-center justify-center rounded-xl border border-slate-200 p-4 text-center hover:bg-slate-50 transition-colors shadow-xs">
              <span class="rounded-full bg-slate-100 p-3 text-slate-700 mb-2">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </span>
              <span class="text-xs font-semibold text-slate-800">Abrir taquilla POS</span>
            </NuxtLink>

            <!-- Supervisar Cajas -->
            <NuxtLink :to="`/events/${id}/cajas`" class="flex flex-col items-center justify-center rounded-xl border border-slate-200 p-4 text-center hover:bg-slate-50 transition-colors shadow-xs">
              <span class="rounded-full bg-slate-100 p-3 text-slate-700 mb-2">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </span>
              <span class="text-xs font-semibold text-slate-800">Control de cajas</span>
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

      <!-- Supervisión de Cajas del Evento (Acceso administrativo en Dashboard) -->
      <div class="grid grid-cols-1 gap-6">
        <AppCard>
          <template #header>
            <div class="flex items-center justify-between w-full">
              <h3 class="font-bold text-slate-900">Supervisión de Cajas en Puerta</h3>
              <span class="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-100 uppercase">En Vivo</span>
            </div>
          </template>

          <div v-if="sessions.length > 0" class="overflow-x-auto py-2">
            <table class="w-full text-sm text-left border-collapse">
              <thead>
                <tr class="border-b border-slate-200 text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  <th class="py-3 px-3 text-slate-500">Operario</th>
                  <th class="py-3 px-3 text-slate-500">Estado</th>
                  <th class="py-3 px-3 text-slate-500">Apertura</th>
                  <th class="py-3 px-3 text-slate-500">Monto Base</th>
                  <th class="py-3 px-3 text-slate-500">Esperado</th>
                  <th class="py-3 px-3 text-slate-500">Físico</th>
                  <th class="py-3 px-3 text-slate-500">Descuadre</th>
                  <th class="py-3 px-3 text-right text-slate-500">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="s in sessions" :key="s.id" class="hover:bg-slate-50/50 transition-colors">
                  <td class="py-3 px-3 font-semibold text-slate-800">{{ s.userFullName }}</td>
                  <td class="py-3 px-3">
                    <span
                      :class="[
                        'inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border',
                        s.status === 'open' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-100 border-slate-200 text-slate-500'
                      ]"
                    >
                      {{ s.status === 'open' ? 'Activo' : 'Cerrado' }}
                    </span>
                  </td>
                  <td class="py-3 px-3 text-xs text-slate-500">
                    {{ formatDateDay(s.openedAt) }} {{ formatDateShort(s.openedAt) }}
                  </td>
                  <td class="py-3 px-3 font-mono text-slate-700">${{ s.openingBalance }}</td>
                  <td class="py-3 px-3 font-mono text-slate-700 font-semibold">{{ s.closingBalanceExpected !== null ? `$${s.closingBalanceExpected}` : '-' }}</td>
                  <td class="py-3 px-3 font-mono text-slate-700">{{ s.closingBalanceReal !== null ? `$${s.closingBalanceReal}` : '-' }}</td>
                  <td class="py-3 px-3 font-mono font-bold">
                    <span v-if="s.status === 'closed'" :class="getDiffClass(s)">
                      {{ getDiffSymbol(s) }}${{ Math.abs(getDiff(s)) }}
                    </span>
                    <span v-else class="text-slate-400">-</span>
                  </td>
                  <td class="py-3 px-3 text-right">
                    <AppButton
                      size="xs"
                      variant="secondary"
                      @click="viewSessionReport(s)"
                    >
                      Ver Reporte
                    </AppButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="text-center py-8 text-sm text-slate-400">
            No se han registrado sesiones de caja para este evento.
          </div>
        </AppCard>
      </div>

      <!-- Reporte Detallado de la Caja Seleccionada en el Dashboard -->
      <div v-if="selectedSession" class="grid grid-cols-1 gap-6 animate-fade-in">
        <AppCard>
          <template #header>
            <div class="flex items-center justify-between w-full">
              <div>
                <h3 class="font-bold text-slate-900">Reporte Detallado de Turno</h3>
                <p class="text-xs text-slate-500 mt-0.5">Operario: <span class="font-semibold text-slate-700">{{ selectedSession.userFullName }}</span></p>
              </div>
              <button
                @click="closeSessionReport"
                class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </template>

          <div v-if="loadingSales" class="flex flex-col items-center justify-center py-12 space-y-3">
            <div class="w-8 h-8 border-3 border-indigo-650 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-slate-500 text-xs font-semibold">Cargando transacciones de venta...</p>
          </div>

          <div v-else class="space-y-6">
            <!-- Totales Financieros Desglosados -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span class="block text-[10px] text-slate-500 uppercase font-semibold">Balance Inicial</span>
                <span class="block text-lg font-black mt-0.5 text-slate-800">${{ selectedSession.openingBalance }}</span>
              </div>
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span class="block text-[10px] text-slate-500 uppercase font-semibold">Ventas en Efectivo</span>
                <span class="block text-lg font-black mt-0.5 text-emerald-650 font-bold">${{ selectedSessionTotals?.cash || 0 }}</span>
              </div>
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span class="block text-[10px] text-slate-500 uppercase font-semibold">Ventas en Tarjeta</span>
                <span class="block text-lg font-black mt-0.5 text-blue-650 font-bold">${{ selectedSessionTotals?.card || 0 }}</span>
              </div>
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span class="block text-[10px] text-slate-500 uppercase font-semibold">Ventas Transferencia</span>
                <span class="block text-lg font-black mt-0.5 text-indigo-650 font-bold">${{ selectedSessionTotals?.transfer || 0 }}</span>
              </div>
            </div>

            <!-- Resumen de Conciliación / Arqueo -->
            <div class="bg-slate-50/50 border border-slate-200 p-5 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <span class="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">Esperado en Caja (Efectivo)</span>
                <span class="block text-2xl font-black mt-1 text-slate-800">
                  ${{ selectedSession.openingBalance + (selectedSessionTotals?.cash || 0) }}
                </span>
                <p class="text-[10px] text-slate-400 mt-1">Base + Ventas en Efectivo</p>
              </div>
              <div>
                <span class="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">Entregado Físicamente</span>
                <span class="block text-2xl font-black mt-1 text-slate-800">
                  {{ selectedSession.closingBalanceReal !== null ? `$${selectedSession.closingBalanceReal}` : 'En turno' }}
                </span>
                <p class="text-[10px] text-slate-400 mt-1">Monto reportado en arqueo</p>
              </div>
              <div>
                <span class="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">Diferencia / Descuadre</span>
                <span class="block text-2xl font-black mt-1" :class="getDiffClass(selectedSession)">
                  {{ selectedSession.status === 'open' ? '-' : `${getDiffSymbol(selectedSession)}$${getDiff(selectedSession)}` }}
                </span>
                <p class="text-[10px] text-slate-400 mt-1">Diferencia auditada de efectivo</p>
              </div>
            </div>

            <!-- Listado de Ingresos / Asistentes en el turno -->
            <div class="space-y-3">
              <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest">Asistentes e Ingresos en Portería</h4>
              <div v-if="selectedSessionSales.length > 0" class="overflow-x-auto max-h-[300px] border border-slate-200 rounded-xl">
                <table class="w-full text-xs text-left border-collapse">
                  <thead class="sticky top-0 bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr class="border-b border-slate-200">
                      <th class="py-2.5 px-3">Asistente</th>
                      <th class="py-2.5 px-3">Etapa / Boleto</th>
                      <th class="py-2.5 px-3 text-right">Monto</th>
                      <th class="py-2.5 px-3 text-center">Método de Pago</th>
                      <th class="py-2.5 px-3">Hora de Ingreso</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 bg-white">
                    <tr v-for="sale in selectedSessionSales" :key="sale.id" class="hover:bg-slate-50/50 transition-colors">
                      <td class="py-2.5 px-3 font-semibold text-slate-800">{{ sale.attendeeName }}</td>
                      <td class="py-2.5 px-3 text-slate-600">{{ sale.tierName }}</td>
                      <td class="py-2.5 px-3 text-right font-mono font-bold text-slate-800">${{ sale.amount }}</td>
                      <td class="py-2.5 px-3 text-center">
                        <span
                          :class="[
                            'px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase border',
                            sale.paymentMethod === 'cash' && 'bg-emerald-50 border-emerald-100 text-emerald-700',
                            sale.paymentMethod === 'card' && 'bg-blue-50 border-blue-100 text-blue-700',
                            sale.paymentMethod === 'transfer' && 'bg-indigo-50 border-indigo-100 text-indigo-700'
                          ]"
                        >
                          {{ sale.paymentMethod === 'cash' ? 'Efectivo' : sale.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia' }}
                        </span>
                      </td>
                      <td class="py-2.5 px-3 text-slate-400">
                        {{ formatDateTime(sale.createdAt) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p v-else class="text-center text-slate-400 py-8 text-xs font-semibold">No se registraron ventas ni ingresos en esta sesión.</p>
            </div>
          </div>
        </AppCard>
      </div>
    </div>
  </div>
</template>
