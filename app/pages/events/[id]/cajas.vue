<template>
  <div class="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
    <!-- Navbar / Cabecera para Operarios (Aislado de Administración) -->
    <header class="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30 px-4 py-3 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <NuxtLink :to="`/events/${eventId}/taquilla`" class="p-2 hover:bg-slate-800 rounded-lg transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </NuxtLink>
        <div>
          <h1 class="text-lg font-bold tracking-tight">Turnos y Control de Cajas</h1>
          <p class="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-xs">{{ eventData?.name || 'Cargando evento...' }}</p>
        </div>
      </div>
    </header>

    <!-- Estado de carga -->
    <div v-if="loading" class="flex-1 flex flex-col items-center justify-center space-y-4">
      <div class="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-slate-400 text-sm">Cargando sesiones...</p>
    </div>

    <main v-else class="flex-1 p-4 max-w-4xl mx-auto w-full space-y-8">
          <!-- Sección de mi Turno de Caja -->
      <section class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h2 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Mi Estado de Caja</h2>

        <div v-if="activeSession" class="space-y-6">
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
              <span class="block text-xs text-slate-500 uppercase font-semibold">Balance Inicial</span>
              <span class="block text-xl font-black mt-1 text-indigo-400">${{ activeSession.openingBalance }}</span>
            </div>
            <div class="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
              <span class="block text-xs text-slate-500 uppercase font-semibold">Fecha de Apertura</span>
              <span class="block text-sm font-semibold mt-1.5">{{ formatDate(activeSession.openedAt) }}</span>
            </div>
          </div>

          <!-- Formulario de Arqueo y Cierre (Req 3.1) -->
          <div class="border-t border-slate-800 pt-6">
            <h3 class="text-sm font-bold mb-3">Realizar Arqueo y Cierre de Turno</h3>
            <form @submit.prevent="handleCloseSession" class="space-y-4">
              <div>
                <label class="block text-xs text-slate-400 uppercase font-medium tracking-wider mb-2">Efectivo Físico Contado en Caja</label>
                <div class="relative rounded-xl shadow-sm">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-semibold">$</div>
                  <input
                    v-model.number="closingBalanceReal"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    class="block w-full pl-9 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-red-500 transition-colors font-semibold"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <button
                type="submit"
                :disabled="submitting"
                class="w-full py-3 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white font-semibold rounded-xl transition-all shadow-lg shadow-red-600/20 flex items-center justify-center space-x-2"
              >
                <span v-if="submitting" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span v-else>Cerrar Caja Definitivamente</span>
              </button>
            </form>
          </div>
        </div>

        <div v-else class="text-center py-6 text-slate-400">
          <p class="text-sm">No tienes una sesión de caja activa para este evento.</p>
          <NuxtLink :to="`/events/${eventId}/taquilla`" class="inline-block mt-4 text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-xl hover:bg-indigo-500/20 transition-all">
            Abrir Caja en Taquilla
          </NuxtLink>
        </div>
      </section>

      <!-- Panel de Historial / Supervisión de Cajas -->
      <section class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 class="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {{ isAdmin ? 'Supervisión de Cajas del Evento' : 'Historial de mis Turnos de Caja' }}
          </h2>
          <span class="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-bold uppercase">
            {{ isAdmin ? 'Supervisión' : 'Mis Turnos' }}
          </span>
        </div>

        <!-- Listado de Cajas del Evento (Req 4.1) -->
        <div v-if="allSessions.length > 0" class="overflow-x-auto">
          <table class="w-full text-sm text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                <th v-if="isAdmin" class="py-3 px-2">Operario</th>
                <th class="py-3 px-2">Estado</th>
                <th class="py-3 px-2">Apertura</th>
                <th class="py-3 px-2">Monto Base</th>
                <th class="py-3 px-2">Esperado</th>
                <th class="py-3 px-2">Físico</th>
                <th class="py-3 px-2">Descuadre</th>
                <th class="py-3 px-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in allSessions" :key="s.id" class="border-b border-slate-800 hover:bg-slate-950/20 transition-colors">
                <td v-if="isAdmin" class="py-3 px-2 font-semibold text-white">{{ s.userFullName }}</td>
                <td class="py-3 px-2">
                  <span
                    :class="[
                      'inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border',
                      s.status === 'open' 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    ]"
                  >
                    {{ s.status === 'open' ? 'Activo' : 'Cerrado' }}
                  </span>
                </td>
                <td class="py-3 px-2 text-xs text-slate-300">
                  {{ formatDateDay(s.openedAt) }} {{ formatDate(s.openedAt) }}
                </td>
                <td class="py-3 px-2 font-mono">${{ s.openingBalance }}</td>
                <td class="py-3 px-2 font-mono text-slate-300">{{ s.closingBalanceExpected !== null ? `$${s.closingBalanceExpected}` : '-' }}</td>
                <td class="py-3 px-2 font-mono text-slate-300">{{ s.closingBalanceReal !== null ? `$${s.closingBalanceReal}` : '-' }}</td>
                <td class="py-3 px-2 font-mono font-bold">
                  <span v-if="s.status === 'closed'" :class="getDiffClass(s)">
                    {{ getDiffSymbol(s) }}${{ Math.abs(getDiff(s)) }}
                  </span>
                  <span v-else class="text-slate-500">-</span>
                </td>
                <td class="py-3 px-2 text-right">
                  <button
                    @click="viewSessionReport(s)"
                    class="px-2.5 py-1 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/25 rounded transition-all cursor-pointer"
                  >
                    Ver Reporte
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="text-center text-slate-500 py-6 text-sm">No se han registrado sesiones de caja en este evento.</p>
      </section>

      <!-- Sección de Reporte Detallado de la Caja Seleccionada -->
      <section v-if="selectedSession" class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 class="text-sm font-bold text-white">Reporte Detallado de Caja</h2>
            <p class="text-xs text-slate-400 mt-0.5">Operario: <span class="text-white font-semibold">{{ selectedSession.userFullName }}</span></p>
          </div>
          <button
            @click="closeSessionReport"
            class="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div v-if="loadingSales" class="flex flex-col items-center justify-center py-12 space-y-3">
          <div class="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-slate-400 text-xs">Cargando transacciones de venta...</p>
        </div>

        <div v-else class="space-y-6 animate-fade-in">
          <!-- Totales Financieros Desglosados -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div class="bg-slate-950 p-4 rounded-xl border border-slate-850">
              <span class="block text-[10px] text-slate-500 uppercase font-semibold">Balance Inicial</span>
              <span class="block text-lg font-black mt-1 text-white">${{ selectedSession.openingBalance }}</span>
            </div>
            <div class="bg-slate-950 p-4 rounded-xl border border-slate-850">
              <span class="block text-[10px] text-slate-500 uppercase font-semibold">Ventas en Efectivo</span>
              <span class="block text-lg font-black mt-1 text-emerald-400">${{ selectedSessionTotals?.cash || 0 }}</span>
            </div>
            <div class="bg-slate-950 p-4 rounded-xl border border-slate-850">
              <span class="block text-[10px] text-slate-500 uppercase font-semibold">Ventas en Tarjeta</span>
              <span class="block text-lg font-black mt-1 text-blue-400">${{ selectedSessionTotals?.card || 0 }}</span>
            </div>
            <div class="bg-slate-950 p-4 rounded-xl border border-slate-850">
              <span class="block text-[10px] text-slate-500 uppercase font-semibold">Ventas Transferencia</span>
              <span class="block text-lg font-black mt-1 text-indigo-400">${{ selectedSessionTotals?.transfer || 0 }}</span>
            </div>
          </div>

          <!-- Resumen de Conciliación / Arqueo -->
          <div class="bg-slate-950/50 border border-slate-850/80 p-5 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <span class="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">Esperado en Caja (Efectivo)</span>
              <span class="block text-2xl font-black mt-1 text-slate-200">
                ${{ selectedSession.openingBalance + (selectedSessionTotals?.cash || 0) }}
              </span>
              <p class="text-[10px] text-slate-500 mt-1">Base + Ventas en Efectivo</p>
            </div>
            <div>
              <span class="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">Entregado Físicamente</span>
              <span class="block text-2xl font-black mt-1" :class="selectedSession.status === 'open' ? 'text-slate-500' : 'text-slate-200'">
                {{ selectedSession.closingBalanceReal !== null ? `$${selectedSession.closingBalanceReal}` : 'En turno' }}
              </span>
              <p class="text-[10px] text-slate-500 mt-1">Monto reportado en arqueo</p>
            </div>
            <div>
              <span class="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">Diferencia / Descuadre</span>
              <span class="block text-2xl font-black mt-1" :class="getDiffClass(selectedSession)">
                {{ selectedSession.status === 'open' ? '-' : `${getDiffSymbol(selectedSession)}$${getDiff(selectedSession)}` }}
              </span>
              <p class="text-[10px] text-slate-500 mt-1">Diferencia auditada de efectivo</p>
            </div>
          </div>

          <!-- Listado de Ingresos / Asistentes en el turno -->
          <div class="space-y-3">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest">Listado de Asistentes e Ingresos</h3>
            <div v-if="selectedSessionSales.length > 0" class="overflow-x-auto max-h-[300px] border border-slate-850 rounded-xl">
              <table class="w-full text-xs text-left border-collapse">
                <thead class="sticky top-0 bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold">
                  <tr class="border-b border-slate-850">
                    <th class="py-2.5 px-3">Asistente</th>
                    <th class="py-2.5 px-3">Etapa / Boleto</th>
                    <th class="py-2.5 px-3 text-right">Monto</th>
                    <th class="py-2.5 px-3 text-center">Método de Pago</th>
                    <th class="py-2.5 px-3">Hora de Ingreso</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-850/50 bg-slate-900/40">
                  <tr v-for="sale in selectedSessionSales" :key="sale.id" class="hover:bg-slate-950/20 transition-colors">
                    <td class="py-2.5 px-3 font-semibold text-slate-200">{{ sale.attendeeName }}</td>
                    <td class="py-2.5 px-3 text-slate-300">{{ sale.tierName }}</td>
                    <td class="py-2.5 px-3 text-right font-mono font-bold text-slate-200">${{ sale.amount }}</td>
                    <td class="py-2.5 px-3 text-center">
                      <span
                        :class="[
                          'px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase border',
                          sale.paymentMethod === 'cash' && 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                          sale.paymentMethod === 'card' && 'bg-blue-500/10 border-blue-500/20 text-blue-400',
                          sale.paymentMethod === 'transfer' && 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
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
            <p v-else class="text-center text-slate-500 py-8 text-xs">No se registraron ventas ni ingresos en esta sesión de caja.</p>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ requiredRoles: ['GATE_STAFF', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER', 'LOGISTICS'] })

import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useEvents } from '~/composables/useEvents'
import { useAuth } from '~/composables/useAuth'
import type { CashSession } from '~/types/ticketing'

const route = useRoute()
const eventId = route.params.id as string

const loading = ref(true)
const submitting = ref(false)
const eventData = ref<any>(null)
const activeSession = ref<CashSession | null>(null)
const closingBalanceReal = ref<number>(0)
const allSessions = ref<CashSession[]>([])

const selectedSession = ref<CashSession | null>(null)
const selectedSessionSales = ref<any[]>([])
const selectedSessionTotals = ref<any>(null)
const loadingSales = ref(false)

const { user } = useAuth()
const isAdmin = ref(false)

// Evaluar permisos de supervisor basados en el rol (Req 4.2)
const checkPermissions = () => {
  const metadata = (user.value?.app_metadata || {}) as { role?: string }
  isAdmin.value = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER'].includes(metadata.role || '')
}

// Cargar estado de cajas
const fetchCajasState = async () => {
  try {
    loading.value = true
    eventData.value = await useEvents().get(eventId)

    // Consultar caja activa del operario actual
    const res = await $fetch<{ session: CashSession | null }>(`/api/cash-sessions/active?eventId=${eventId}`)
    activeSession.value = res.session

    // Cargar historial de cajas
    const resList = await $fetch<{ sessions: CashSession[] }>(`/api/cash-sessions?eventId=${eventId}`)
    allSessions.value = resList.sessions
  } catch (err) {
    console.error('Error al cargar control de cajas:', err)
  } finally {
    loading.value = false
  }
}

// Cerrar turno de caja y realizar arqueo (Req 3.2)
const handleCloseSession = async () => {
  if (!activeSession.value) return

  const confirmClose = confirm('¿Estás seguro de que deseas cerrar esta sesión de caja? Esto bloqueará futuros registros de venta para este turno.')
  if (!confirmClose) return

  try {
    submitting.value = true
    const closed = await $fetch<CashSession>('/api/cash-sessions/close', {
      method: 'POST',
      body: {
        sessionId: activeSession.value.id,
        closingBalanceReal: closingBalanceReal.value
      }
    })
    activeSession.value = null
    alert(`Caja cerrada exitosamente. Saldo Físico: $${closed.closingBalanceReal}. Saldo Esperado: $${closed.closingBalanceExpected}. Descuadre: $${closed.closingBalanceReal - (closed.closingBalanceExpected || 0)}`)
    
    // Recargar estado
    await fetchCajasState()
  } catch (err: any) {
    alert(err.statusMessage || 'No se pudo realizar el cierre de caja')
  } finally {
    submitting.value = false
  }
}

// Cargar reporte de ventas detallado para la sesión seleccionada
const viewSessionReport = async (session: CashSession) => {
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

// Cerrar la vista de reporte detallado
const closeSessionReport = () => {
  selectedSession.value = null
  selectedSessionSales.value = []
  selectedSessionTotals.value = null
}

// Utilidades matemáticas y visuales de arqueo
const getDiff = (session: CashSession) => {
  return (session.closingBalanceReal || 0) - (session.closingBalanceExpected || 0)
}

const getDiffSymbol = (session: CashSession) => {
  const diff = getDiff(session)
  if (diff > 0) return '+'
  return ''
}

const getDiffClass = (session: CashSession) => {
  const diff = getDiff(session)
  if (diff === 0) return 'text-emerald-400' // Exacto
  if (diff > 0) return 'text-blue-400'     // Sobrante
  return 'text-red-400 font-bold'          // Faltante (Rojo advertencia)
}

// Formatear marcas de tiempo
const formatDate = (isoString: string) => {
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
  checkPermissions()
  await fetchCajasState()
})
</script>
