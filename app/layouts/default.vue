<script setup lang="ts">
const { authContext, signOut, refreshContext, switchCompany } = useAuth()

// Carga la identidad confiable desde el servidor (SSR + cliente).
await useAsyncData('auth:context', () => refreshContext())

// Carga las empresas asociadas al usuario
const { data: myCompanies, refresh: refreshCompanies } = await useAsyncData('auth:my-companies', () => 
  $fetch<any[]>('/api/auth/my-companies').catch(() => [])
)

const isDisabled = computed(() => authContext.value?.status === 'disabled')
const currentRole = computed(() => authContext.value?.role)
const currentCompanyId = computed(() => authContext.value?.companyId ?? '')

const isMobileOpen = ref(false)

async function onCompanySwitch(companyId: string) {
  const targetId = companyId === 'global' ? null : companyId
  try {
    await switchCompany(targetId)
    await refreshCompanies()
    isMobileOpen.value = false
    // El tenant cambió en el JWT; limpiar caché para que la página destino
    // recargue con el nuevo ámbito (evita datos globales/empresa mezclados).
    clearNuxtData()
    const role = authContext.value?.role
    if (role === 'SUPER_ADMIN') {
      await navigateTo('/admin/dashboard')
    } else if (role === 'GATE_STAFF') {
      await navigateTo('/scan')
    } else {
      await navigateTo('/')
    }
  } catch (err) {
    console.error('Error al cambiar de empresa:', err)
  }
}

function toggleMobile() {
  isMobileOpen.value = !isMobileOpen.value
}
</script>

<template>
  <div class="min-h-screen bg-[#F6F8FB] text-slate-800 flex flex-col lg:flex-row font-sans">
    <!-- CABECERA MÓVIL (Solo visible en pantallas menores a lg) -->
    <header class="lg:hidden flex items-center justify-between border-b border-slate-200 bg-[#080D1F] px-4 py-3 text-white sticky top-0 z-40">
      <div class="flex items-center gap-2">
        <div class="h-7 w-7 rounded bg-gradient-to-tr from-violet-600 to-blue-600 flex items-center justify-center font-black text-xs">
          VF
        </div>
        <span class="font-bold tracking-tight text-slate-100 text-sm">Vita Felix</span>
      </div>
      
      <button
        type="button"
        class="rounded-lg p-1.5 hover:bg-slate-800 text-slate-300 focus:outline-none"
        @click="toggleMobile"
      >
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            :d="isMobileOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'"
          />
        </svg>
      </button>
    </header>

    <!-- SIDEBAR DE ESCRITORIO / CAJÓN DE MÓVIL -->
    <aside
      class="w-64 bg-[#080D1F] text-slate-300 flex flex-col justify-between shrink-0 border-r border-slate-900 transition-all duration-300 fixed lg:sticky top-0 h-screen z-30"
      :class="[
        isMobileOpen ? 'left-0' : '-left-64 lg:left-0'
      ]"
    >
      <div class="flex flex-col gap-6 p-5 overflow-y-auto">
        <!-- Brand Logo (Desktop) -->
        <div class="hidden lg:flex items-center gap-2">
          <div class="h-8 w-8 rounded-lg bg-gradient-to-tr from-violet-600 to-blue-600 flex items-center justify-center font-black text-white text-sm">
            VF
          </div>
          <span class="text-lg font-bold tracking-wider uppercase text-slate-100">Vita Felix</span>
        </div>

        <!-- Selector de Empresa Activa (Tenant Switcher) -->
        <div v-if="!isDisabled && myCompanies && myCompanies.length > 0" class="space-y-1.5">
          <label class="px-3 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
            Organización
          </label>
          <div class="relative px-3">
            <select
              :value="currentCompanyId || 'global'"
              class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 pr-10 text-xs font-semibold text-white focus:outline-none appearance-none cursor-pointer"
              @change="onCompanySwitch(($event.target as HTMLSelectElement).value)"
            >
              <!-- Opción Global solo para Super Admin -->
              <option v-if="currentRole === 'SUPER_ADMIN'" value="global">
                🌐 Control Global (SaaS)
              </option>
              <option
                v-for="co in myCompanies"
                :key="co.id"
                :value="co.id"
              >
                🏢 {{ co.name }}
              </option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-3 flex items-center pr-3 text-slate-400">
              <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Navegación -->
        <div class="mt-2">
          <AppNav />
        </div>
      </div>

      <!-- Footer del Sidebar: Perfil de Usuario y Cierre de Sesión -->
      <div class="border-t border-slate-900 bg-[#060a18] p-4 space-y-3">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white uppercase">
            {{ authContext?.email?.substring(0, 2) || 'US' }}
          </div>
          <div class="overflow-hidden">
            <p class="text-xs font-semibold text-white truncate">{{ authContext?.email }}</p>
            <p class="text-[10px] text-slate-500 truncate font-semibold uppercase tracking-wider">
              {{ authContext?.role ?? 'Sin rol' }}
            </p>
          </div>
        </div>
        
        <AppButton
          variant="outline"
          size="sm"
          class="w-full border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
          @click="signOut()"
        >
          Cerrar sesión
        </AppButton>
      </div>
    </aside>

    <!-- Fondo de cajón móvil (Overlay) -->
    <div
      v-if="isMobileOpen"
      class="fixed inset-0 bg-black/50 z-20 lg:hidden"
      @click="toggleMobile"
    />

    <!-- ÁREA PRINCIPAL DE CONTENIDO -->
    <main class="flex-1 flex flex-col min-w-0">
      <!-- Barra superior de escritorio -->
      <header class="hidden lg:flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4 sticky top-0 z-10">
        <div>
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            SaaS Ticketing & Acceso
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-slate-600">Estado del servicio:</span>
          <span class="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span class="text-xs font-semibold text-emerald-600">Activo</span>
        </div>
      </header>

      <!-- Contenedor del slot principal -->
      <div class="flex-1 p-6 lg:p-8 overflow-y-auto">
        <!-- Aviso de cuenta deshabilitada -->
        <div
          v-if="isDisabled"
          class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 mb-6 flex items-start gap-3 shadow-xs"
        >
          <svg class="h-5 w-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p class="font-bold">Cuenta en revisión o deshabilitada</p>
            <p class="mt-0.5 text-slate-600">Tu perfil de usuario aún no ha sido habilitado por un administrador. Contacta al soporte de tu empresa organizadora.</p>
          </div>
        </div>

        <slot v-else />
      </div>
    </main>
  </div>
</template>
