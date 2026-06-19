<template>
  <div class="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
    <!-- Navbar / Cabecera -->
    <header class="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30 px-4 py-3 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <NuxtLink to="/scan" class="p-2 hover:bg-slate-800 rounded-lg transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </NuxtLink>
        <div>
          <h1 class="text-lg font-bold tracking-tight">Taquilla / Venta en Puerta</h1>
          <p class="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-xs">{{ eventData?.name || 'Cargando evento...' }}</p>
        </div>
      </div>
      
      <!-- Estado de la caja -->
      <div v-if="activeSession" class="flex items-center space-x-3">
        <NuxtLink :to="`/events/${eventId}/cajas`" class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-2 transition-all">
          <span class="h-2 w-2 bg-emerald-400 rounded-full animate-pulse"></span>
          <span>Caja Abierta</span>
        </NuxtLink>
      </div>
    </header>

    <!-- Estado de Carga -->
    <div v-if="loading" class="flex-1 flex flex-col items-center justify-center space-y-4">
      <div class="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-slate-400 text-sm">Sincronizando estado...</p>
    </div>

    <!-- Apertura de Caja (Si no hay sesión activa) -->
    <div v-else-if="!activeSession" class="flex-1 flex items-center justify-center p-4">
      <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-xl backdrop-blur-md">
        <div class="text-center mb-6">
          <div class="inline-flex p-3 bg-indigo-500/10 text-indigo-400 rounded-full mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h2 class="text-xl font-bold">Apertura de Caja</h2>
          <p class="text-sm text-slate-400 mt-1">Registra el efectivo inicial para iniciar el control de caja del turno.</p>
        </div>

        <form @submit.prevent="handleOpenSession" class="space-y-4">
          <div>
            <label class="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">Base de Efectivo Inicial (Saldo Base)</label>
            <div class="relative rounded-xl shadow-sm">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-semibold">$</div>
              <input
                v-model.number="openingBalance"
                type="number"
                min="0"
                step="0.01"
                required
                class="block w-full pl-9 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors font-semibold"
                placeholder="0.00"
              />
            </div>
          </div>

          <button
            type="submit"
            :disabled="submitting"
            class="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2"
          >
            <span v-if="submitting" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span v-else>Abrir Turno de Caja</span>
          </button>
        </form>
      </div>
    </div>

    <!-- Panel de Ventas POS (Si hay caja abierta) -->
    <main v-else class="flex-1 p-4 max-w-4xl mx-auto w-full flex flex-col justify-between space-y-6">
      
      <!-- Listado de Categorías/Tiers de Entrada -->
      <div class="flex-1 flex flex-col justify-center">
        <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 text-center sm:text-left">Selecciona la Etapa de Entrada</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            v-for="tier in eventData?.tiers"
            :key="tier.id"
            @click="selectTier(tier)"
            class="group relative bg-slate-900 border border-slate-800 hover:border-indigo-500 hover:bg-slate-900/80 active:scale-98 p-6 rounded-2xl text-left transition-all duration-200 shadow-md flex items-center justify-between"
          >
            <div>
              <span class="block font-bold text-lg group-hover:text-indigo-400 transition-colors">{{ tier.name }}</span>
              <span class="block text-xs text-slate-400 mt-1 uppercase tracking-wider">Precio Presencial</span>
            </div>
            <div class="text-right">
              <span class="block font-black text-2xl text-indigo-400">${{ tier.price }}</span>
              <span class="block text-[10px] text-slate-500 uppercase font-semibold tracking-widest mt-0.5">{{ tier.currency }}</span>
            </div>
          </button>
        </div>
      </div>

      <!-- Footer rápido de sesión de caja -->
      <footer class="bg-slate-900/30 border border-slate-800/80 p-4 rounded-2xl flex items-center justify-between">
        <div class="text-xs text-slate-400">
          <p>Operador: <span class="text-white font-semibold">{{ activeSession.userFullName || 'Personal de Puerta' }}</span></p>
          <p class="mt-0.5">Base de apertura: <span class="text-white font-semibold">${{ activeSession.openingBalance }}</span></p>
        </div>
        <NuxtLink :to="`/events/${eventId}/cajas`" class="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1">
          <span>Arqueo y Cierre de Turno</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </NuxtLink>
      </footer>
    </main>

    <!-- Modal de Selección de Pago -->
    <div v-if="selectedTier" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-opacity">
      <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
        <button @click="selectedTier = null" class="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div class="text-center mb-6">
          <span class="text-[10px] uppercase font-bold tracking-widest text-indigo-400">Venta Rápida</span>
          <h2 class="text-xl font-bold mt-1">{{ selectedTier.name }}</h2>
          <div class="mt-3 inline-flex items-baseline space-x-1">
            <span class="text-3xl font-black">${{ selectedTier.price }}</span>
            <span class="text-xs text-slate-400 uppercase">{{ selectedTier.currency }}</span>
          </div>
        </div>

        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-3">Método de Pago recibido</h3>
        <div class="grid grid-cols-3 gap-3 mb-4">
          <button
            @click="processSale('cash')"
            :disabled="submitting"
            class="flex flex-col items-center justify-center p-4 bg-slate-950 border border-slate-800 hover:border-emerald-500 rounded-xl transition-all hover:bg-slate-950/50 cursor-pointer"
          >
            <div class="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-full mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span class="font-bold text-xs">Efectivo</span>
          </button>

          <button
            @click="processSale('card')"
            :disabled="submitting"
            class="flex flex-col items-center justify-center p-4 bg-slate-950 border border-slate-800 hover:border-blue-500 rounded-xl transition-all hover:bg-slate-950/50 cursor-pointer"
          >
            <div class="p-2.5 bg-blue-500/10 text-blue-400 rounded-full mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <span class="font-bold text-xs">Tarjeta</span>
          </button>

          <button
            @click="processSale('transfer')"
            :disabled="submitting"
            class="flex flex-col items-center justify-center p-4 bg-slate-950 border border-slate-800 hover:border-indigo-500 rounded-xl transition-all hover:bg-slate-950/50 cursor-pointer"
          >
            <div class="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-full mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <span class="font-bold text-xs">Transferencia</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Pantalla Verde Gigante de Éxito / Admisión Directa (Req 2.3) -->
    <div
      v-if="successScreen"
      class="fixed inset-0 z-50 bg-emerald-500 text-white flex flex-col items-center justify-center animate-fade-in"
    >
      <div class="p-6 bg-white/10 rounded-full animate-bounce mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 class="text-4xl sm:text-5xl font-black uppercase tracking-wider text-center px-4">Ingreso Admitido</h2>
      <p class="text-emerald-100 text-lg mt-3 font-semibold uppercase tracking-widest">{{ admittedTierName }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ requiredRoles: ['GATE_STAFF', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER', 'LOGISTICS'] })

import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useEvents } from '~/composables/useEvents'
import type { CashSession } from '~/types/ticketing'

const route = useRoute()
const eventId = route.params.id as string

const loading = ref(true)
const submitting = ref(false)
const eventData = ref<any>(null)
const activeSession = ref<CashSession | null>(null)
const openingBalance = ref<number>(0)

const selectedTier = ref<any>(null)
const successScreen = ref(false)
const admittedTierName = ref('')

// Carga inicial del estado
const fetchState = async () => {
  try {
    loading.value = true
    // Cargar detalles del evento y sus tiers
    eventData.value = await useEvents().get(eventId)

    // Cargar sesión de caja activa del usuario
    const res = await $fetch<{ session: CashSession | null }>(`/api/cash-sessions/active?eventId=${eventId}`)
    activeSession.value = res.session
  } catch (err) {
    console.error('Error al sincronizar datos de taquilla:', err)
  } finally {
    loading.value = false
  }
}

// Abrir sesión de caja
const handleOpenSession = async () => {
  try {
    submitting.value = true
    const session = await $fetch<CashSession>('/api/cash-sessions/open', {
      method: 'POST',
      body: {
        eventId,
        companyId: eventData.value?.companyId,
        openingBalance: openingBalance.value
      }
    })
    activeSession.value = session
  } catch (err: any) {
    alert(err.statusMessage || 'No se pudo abrir la caja')
  } finally {
    submitting.value = false
  }
}

// Seleccionar etapa de entrada para cobro
const selectTier = (tier: any) => {
  selectedTier.value = tier
}

// Registrar la venta física y dar check-in inmediato
const processSale = async (method: 'cash' | 'card' | 'transfer') => {
  if (!selectedTier.value) return

  try {
    submitting.value = true
    const tier = selectedTier.value

    const res = await $fetch<{ success: boolean; ticketId: string }>('/api/events/' + eventId + '/door-sales', {
      method: 'POST',
      body: {
        tierId: tier.id,
        paymentMethod: method
      }
    })

    if (res.success) {
      // Activar pantalla gigante de confirmación visual (Req 2.3)
      admittedTierName.value = tier.name
      successScreen.value = true
      selectedTier.value = null

      // Sonido de éxito corto
      playSuccessSound()

      // Desvanecer después de 2 segundos
      setTimeout(() => {
        successScreen.value = false
        admittedTierName.value = ''
      }, 2000)
    }
  } catch (err: any) {
    alert(err.statusMessage || 'Error al procesar la venta en puerta. Verifica el cupo disponible.')
  } finally {
    submitting.value = false
  }
}

// Sonido de éxito auditivo mediante Web Audio API
const playSuccessSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    
    osc.type = 'sine'
    // Tono agradable y alegre de confirmación
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime) // Re5
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3)
    
    osc.start()
    osc.stop(audioCtx.currentTime + 0.3)
  } catch (e) {
    console.warn('AudioContext no soportado:', e)
  }
}

onMounted(() => {
  fetchState()
})
</script>

<style scoped>
.animate-bounce {
  animation: bounce 1s infinite;
}
@keyframes bounce {
  0%, 100% {
    transform: translateY(-5%);
    animation-timing-function: cubic-bezier(0.8,0,1,1);
  }
  50% {
    transform: none;
    animation-timing-function: cubic-bezier(0,0,0.2,1);
  }
}
.animate-fade-in {
  animation: fadeIn 0.15s ease-out forwards;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.active\:scale-98:active {
  transform: scale(0.98);
}
</style>
