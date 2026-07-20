<script setup lang="ts">
definePageMeta({
  public: true,
  layout: false,
  middleware: 'home-redirect'
})

const appConfig = useAppConfig()
const year = new Date().getFullYear()

// Animación al hacer scroll simple montada
onMounted(() => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('opacity-100', 'translate-y-0')
        entry.target.classList.remove('opacity-0', 'translate-y-8')
      }
    })
  }, { threshold: 0.1 })

  document.querySelectorAll('.scroll-reveal').forEach((el) => {
    observer.observe(el)
  })
})
</script>

<template>
  <div class="relative min-h-screen bg-[#0a0614] text-slate-300 font-sans overflow-x-hidden selection:bg-violet-500/30 selection:text-white">
    <!-- Fondo Atmosférico Base -->
    <div
      class="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(124,58,237,0.15),transparent_55%),radial-gradient(ellipse_50%_40%_at_0%_80%,rgba(168,85,247,0.08),transparent_45%)]"
      aria-hidden="true"
    />
    
    <!-- Header Minimalista -->
    <header class="relative z-50 flex items-center justify-between px-6 py-5 lg:px-12 lg:py-6 bg-transparent border-b border-white/[0.02]">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-black tracking-tight text-white shadow-lg shadow-violet-500/20 ring-1 ring-white/10">
          VF
        </div>
        <span class="text-lg font-bold tracking-widest text-white uppercase">{{ appConfig.app.name }}</span>
      </div>
      <div class="flex items-center gap-4">
        <NuxtLink to="/login">
          <button class="rounded-full bg-white/[0.04] px-5 py-2 text-sm font-medium text-white backdrop-blur-md transition-all hover:bg-white/[0.1] hover:scale-105 ring-1 ring-white/10 cursor-pointer shadow-sm">
            Iniciar Sesión
          </button>
        </NuxtLink>
      </div>
    </header>

    <!-- 1. Hero Section -->
    <main class="relative z-10 flex flex-col items-center justify-center pt-24 pb-16 px-4 text-center">
      <!-- Glow superior Hero -->
      <div class="pointer-events-none absolute -top-40 left-1/2 h-96 w-[800px] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[120px] motion-safe:animate-pulse" style="animation-duration: 8s" />

      <div class="max-w-5xl mx-auto space-y-8 fade-in-up">
        <div class="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-4 py-1.5 text-xs font-medium text-slate-300 backdrop-blur-xl shadow-xs transition-colors hover:bg-white/[0.05]">
          <span class="flex h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
          Plataforma para organizadores profesionales
        </div>

        <h1 class="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
          Vende entradas, controla accesos <br class="hidden lg:block"/>
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">desde una sola plataforma.</span>
        </h1>

        <p class="mx-auto max-w-2xl text-lg sm:text-xl text-slate-400 font-normal leading-relaxed">
          Todo lo que necesitas para gestionar eventos de principio a fin. Analíticas en tiempo real, protección antifraude y control en puerta ultrarrápido.
        </p>

        <div class="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          <NuxtLink to="/login">
            <button class="w-full sm:w-auto rounded-full bg-white text-slate-900 px-8 py-3.5 text-sm font-bold shadow-xl shadow-white/10 transition-all hover:scale-105 hover:bg-slate-100 hover:shadow-white/20 cursor-pointer">
              Comenzar ahora
            </button>
          </NuxtLink>
          <a href="#demo" class="w-full sm:w-auto rounded-full border border-white/10 bg-white/[0.03] px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/[0.08] cursor-pointer">
            Ver demostración
          </a>
        </div>
      </div>

      <!-- Hero Mockup (Estilo Linear/Vercel) -->
      <div class="mt-20 w-full max-w-6xl mx-auto px-4 relative perspective-1000 scroll-reveal opacity-0 translate-y-8 transition-all duration-1000 ease-out">
        <!-- Glow perimetral del mockup -->
        <div class="absolute inset-0 bg-gradient-to-b from-violet-500/10 to-transparent blur-3xl -z-10 rounded-3xl" />
        
        <div class="relative rounded-2xl border border-white/[0.1] bg-[#0a0614]/80 backdrop-blur-2xl shadow-2xl shadow-violet-900/40 overflow-hidden ring-1 ring-white/5">
          <!-- Mockup Header -->
          <div class="flex items-center border-b border-white/[0.05] bg-white/[0.02] px-4 py-3">
            <div class="flex gap-1.5">
              <div class="h-3 w-3 rounded-full bg-slate-700" />
              <div class="h-3 w-3 rounded-full bg-slate-700" />
              <div class="h-3 w-3 rounded-full bg-slate-700" />
            </div>
            <div class="mx-auto flex h-6 w-64 items-center justify-center rounded-md bg-white/[0.03] text-[10px] text-slate-500 font-medium font-mono border border-white/[0.05]">
              app.vitafelix.com/dashboard
            </div>
          </div>
          <!-- Mockup Content -->
          <div class="grid grid-cols-1 md:grid-cols-4 min-h-[400px]">
            <!-- Sidebar fake -->
            <div class="hidden md:flex flex-col border-r border-white/[0.05] bg-white/[0.01] p-4 space-y-4">
              <div class="h-8 w-full rounded-md bg-white/[0.05]" />
              <div class="space-y-2 pt-4">
                <div class="h-6 w-3/4 rounded-md bg-violet-500/20 border border-violet-500/30" />
                <div class="h-6 w-5/6 rounded-md bg-white/[0.03]" />
                <div class="h-6 w-full rounded-md bg-white/[0.03]" />
                <div class="h-6 w-2/3 rounded-md bg-white/[0.03]" />
              </div>
            </div>
            <!-- Main fake -->
            <div class="col-span-3 p-6 space-y-6">
              <div class="flex justify-between items-center">
                <div class="h-6 w-48 rounded-md bg-white/[0.08]" />
                <div class="h-8 w-24 rounded-full bg-white/[0.05]" />
              </div>
              <div class="grid grid-cols-3 gap-4">
                <div class="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
                  <div class="text-xs text-slate-500 mb-2">Ingresos Netos</div>
                  <div class="text-xl font-bold text-white">$45,230.00</div>
                  <div class="mt-2 h-1 w-full bg-white/[0.05] rounded-full overflow-hidden">
                    <div class="h-full bg-violet-500 w-3/4" />
                  </div>
                </div>
                <div class="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
                  <div class="text-xs text-slate-500 mb-2">Tickets Emitidos</div>
                  <div class="text-xl font-bold text-white">1,245</div>
                  <div class="mt-2 h-1 w-full bg-white/[0.05] rounded-full overflow-hidden">
                    <div class="h-full bg-emerald-500 w-5/6" />
                  </div>
                </div>
                <div class="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
                  <div class="text-xs text-slate-500 mb-2">Check-ins</div>
                  <div class="text-xl font-bold text-white">892</div>
                  <div class="mt-2 h-1 w-full bg-white/[0.05] rounded-full overflow-hidden">
                    <div class="h-full bg-indigo-500 w-1/2" />
                  </div>
                </div>
              </div>
              <!-- Chart fake -->
              <div class="h-48 w-full rounded-xl border border-white/[0.05] bg-gradient-to-b from-white/[0.02] to-transparent p-4 flex items-end gap-2">
                 <div v-for="i in 12" :key="i" class="flex-1 bg-violet-500/20 rounded-t-sm transition-all hover:bg-violet-500/40 cursor-crosshair" :style="{ height: `${Math.floor(Math.random() * 60) + 20}%` }" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 4. Sección Métricas (Social Proof) -->
    <section class="relative z-10 py-16 border-y border-white/[0.02] bg-white/[0.01]">
      <div class="mx-auto max-w-7xl px-6 lg:px-8">
        <div class="grid grid-cols-2 gap-8 md:grid-cols-4 text-center">
          <div class="scroll-reveal opacity-0 translate-y-8 transition-all duration-700 ease-out delay-100">
            <div class="text-4xl font-bold text-white tracking-tight">AES-256</div>
            <div class="mt-2 text-xs font-medium text-slate-500 uppercase tracking-widest">Cifrado de Entradas</div>
          </div>
          <div class="scroll-reveal opacity-0 translate-y-8 transition-all duration-700 ease-out delay-200">
            <div class="text-4xl font-bold text-white tracking-tight">&lt; 1s</div>
            <div class="mt-2 text-xs font-medium text-slate-500 uppercase tracking-widest">Tiempo de Check-in</div>
          </div>
          <div class="scroll-reveal opacity-0 translate-y-8 transition-all duration-700 ease-out delay-300">
            <div class="text-4xl font-bold text-white tracking-tight">99.99%</div>
            <div class="mt-2 text-xs font-medium text-slate-500 uppercase tracking-widest">Disponibilidad SLA</div>
          </div>
          <div class="scroll-reveal opacity-0 translate-y-8 transition-all duration-700 ease-out delay-400">
            <div class="text-4xl font-bold text-white tracking-tight">0%</div>
            <div class="mt-2 text-xs font-medium text-slate-500 uppercase tracking-widest">Riesgo de Fraude</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. Cómo funciona (Flujo) -->
    <section class="relative z-10 py-24 lg:py-32 overflow-hidden">
      <div class="mx-auto max-w-7xl px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-16 scroll-reveal opacity-0 translate-y-8 transition-all duration-700">
          <h2 class="text-3xl lg:text-4xl font-bold text-white tracking-tight">Orquestación perfecta, <br/><span class="text-slate-400">de principio a fin.</span></h2>
        </div>
        
        <div class="relative">
          <!-- Línea conectora (Desktop) -->
          <div class="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-transparent via-violet-500/20 to-transparent -z-10" />
          
          <div class="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div v-for="(step, idx) in [
              { title: 'Crea tu evento', icon: '📝' },
              { title: 'Publica boletería', icon: '🎟️' },
              { title: 'Recibe pagos', icon: '💳' },
              { title: 'Control QR', icon: '📱' },
              { title: 'Analiza', icon: '📊' }
            ]" :key="idx" class="relative flex flex-col items-center group scroll-reveal opacity-0 translate-y-8 transition-all duration-700" :style="{ transitionDelay: `${idx * 150}ms` }">
              <div class="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#0a0614] shadow-xl shadow-violet-900/10 text-2xl z-10 transition-transform group-hover:-translate-y-2 group-hover:border-violet-500/50 group-hover:shadow-violet-500/20">
                {{ step.icon }}
              </div>
              <div class="mt-6 text-center">
                <div class="text-[10px] font-bold text-violet-400 tracking-widest mb-1 uppercase">Paso 0{{ idx + 1 }}</div>
                <h3 class="text-sm font-semibold text-white">{{ step.title }}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 5. Tarjetas Premium -->
    <section id="demo" class="relative z-10 py-24 bg-white/[0.01] border-y border-white/[0.02]">
      <div class="mx-auto max-w-7xl px-6 lg:px-8">
        <div class="grid grid-cols-1 gap-8 md:grid-cols-3">
          <!-- Card 1 -->
          <div class="group relative rounded-3xl border border-white/[0.08] bg-[#0a0614]/50 backdrop-blur-md p-8 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.02] hover:shadow-2xl hover:shadow-violet-500/10 hover:border-violet-500/30 overflow-hidden scroll-reveal opacity-0 translate-y-8">
            <div class="absolute inset-0 bg-gradient-to-br from-violet-500/0 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div class="relative z-10">
              <div class="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.03] text-violet-400 ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-110 group-hover:bg-violet-500/20 group-hover:ring-violet-500/30 group-hover:shadow-lg group-hover:shadow-violet-500/20">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
              </div>
              <h3 class="text-lg font-bold text-white mb-2">Ticketing Seguro</h3>
              <p class="text-sm text-slate-400 leading-relaxed font-normal">
                Generación de códigos QR únicos y cifrados. Previene la reventa y el fraude en tiempo real.
              </p>
            </div>
          </div>

          <!-- Card 2 -->
          <div class="group relative rounded-3xl border border-white/[0.08] bg-[#0a0614]/50 backdrop-blur-md p-8 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.02] hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/30 overflow-hidden scroll-reveal opacity-0 translate-y-8 delay-100">
             <div class="absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div class="relative z-10">
              <div class="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.03] text-emerald-400 ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-110 group-hover:bg-emerald-500/20 group-hover:ring-emerald-500/30 group-hover:shadow-lg group-hover:shadow-emerald-500/20">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4" /></svg>
              </div>
              <h3 class="text-lg font-bold text-white mb-2">Control en Puerta</h3>
              <p class="text-sm text-slate-400 leading-relaxed font-normal">
                Escáner móvil de alta velocidad para validaciones instantáneas. Despliegue en múltiples accesos sin cuellos de botella.
              </p>
            </div>
          </div>

          <!-- Card 3 -->
          <div class="group relative rounded-3xl border border-white/[0.08] bg-[#0a0614]/50 backdrop-blur-md p-8 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.02] hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-500/30 overflow-hidden scroll-reveal opacity-0 translate-y-8 delay-200">
             <div class="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div class="relative z-10">
              <div class="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.03] text-indigo-400 ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-110 group-hover:bg-indigo-500/20 group-hover:ring-indigo-500/30 group-hover:shadow-lg group-hover:shadow-indigo-500/20">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
              <h3 class="text-lg font-bold text-white mb-2">Visibilidad Total</h3>
              <p class="text-sm text-slate-400 leading-relaxed font-normal">
                Analíticas consolidadas de ventas y ocupación por hora. Decisiones basadas en datos antes, durante y después del evento.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 6. Sección de Dashboard Expandida (Mockups secundarios) -->
    <section class="relative z-10 py-24 lg:py-32 overflow-hidden">
      <div class="mx-auto max-w-7xl px-6 lg:px-8 space-y-24">
        
        <!-- Feature block 1 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center scroll-reveal opacity-0 translate-y-8 transition-all duration-700">
          <div class="space-y-6">
            <h3 class="text-3xl font-bold text-white tracking-tight">Gestión centralizada de eventos</h3>
            <p class="text-base text-slate-400 leading-relaxed font-normal">
              Organiza tu cartelera, configura tipos de boletas, capacidades y precios desde un panel intuitivo. Actualizaciones en tiempo real sin recargar la página.
            </p>
            <ul class="space-y-3">
              <li class="flex items-center gap-3 text-sm font-medium text-slate-300">
                <span class="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-violet-400">✓</span>
                Publicación con un clic
              </li>
              <li class="flex items-center gap-3 text-sm font-medium text-slate-300">
                 <span class="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-violet-400">✓</span>
                Gestión de múltiples empresas
              </li>
            </ul>
          </div>
          <!-- Mini mockup abstract -->
          <div class="relative rounded-2xl border border-white/[0.08] bg-[#0a0614]/80 p-6 shadow-2xl backdrop-blur-md">
            <div class="space-y-4">
               <div class="h-4 w-1/3 bg-white/[0.05] rounded-md" />
               <div class="grid grid-cols-2 gap-4">
                 <div class="h-24 bg-white/[0.03] rounded-xl border border-white/[0.02]" />
                 <div class="h-24 bg-white/[0.03] rounded-xl border border-white/[0.02]" />
               </div>
               <div class="h-8 bg-violet-600 rounded-md w-full opacity-80" />
            </div>
          </div>
        </div>

        <!-- Feature block 2 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center scroll-reveal opacity-0 translate-y-8 transition-all duration-700">
          <div class="order-2 lg:order-1 relative rounded-2xl border border-white/[0.08] bg-[#0a0614]/80 p-6 shadow-2xl backdrop-blur-md">
            <div class="space-y-4">
               <div class="flex gap-4 items-end justify-between border-b border-white/[0.05] pb-4">
                 <div class="h-16 w-16 bg-white/[0.05] rounded-xl" />
                 <div class="h-6 w-24 bg-emerald-500/20 border border-emerald-500/40 rounded-full" />
               </div>
               <div class="space-y-2">
                 <div class="h-3 w-full bg-white/[0.03] rounded-full" />
                 <div class="h-3 w-4/5 bg-white/[0.03] rounded-full" />
               </div>
            </div>
          </div>
          <div class="order-1 lg:order-2 space-y-6">
            <h3 class="text-3xl font-bold text-white tracking-tight">Escaneo y Validación Instantánea</h3>
            <p class="text-base text-slate-400 leading-relaxed font-normal">
              Aplicación web optimizada para dispositivos móviles de tu staff. Valida entradas offline y online, con sincronización de estado para múltiples puertas de acceso.
            </p>
            <NuxtLink to="/scan" class="inline-flex items-center gap-2 text-sm font-semibold text-violet-400 hover:text-violet-300">
              Ver modo escáner <span>→</span>
            </NuxtLink>
          </div>
        </div>

      </div>
    </section>

    <!-- 7. Sección Confianza -->
    <section class="relative z-10 py-24 bg-gradient-to-b from-transparent to-black/50 border-t border-white/[0.02]">
      <div class="mx-auto max-w-4xl px-6 text-center scroll-reveal opacity-0 translate-y-8 transition-all duration-700">
        <h2 class="text-3xl font-bold text-white tracking-tight mb-4">Construido para escalar. Diseñado para proteger.</h2>
        <p class="text-slate-400 mb-12">
          La tranquilidad de tu operación es nuestra prioridad. Ofrecemos infraestructura de nivel empresarial.
        </p>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-6 text-left">
          <div class="p-4">
            <div class="font-semibold text-white mb-1">Pagos Seguros</div>
            <div class="text-xs text-slate-500">Procesamiento transparente y con cumplimiento PCI.</div>
          </div>
          <div class="p-4">
            <div class="font-semibold text-white mb-1">Cifrado End-to-End</div>
            <div class="text-xs text-slate-500">Tus datos y los de tus clientes protegidos siempre.</div>
          </div>
          <div class="p-4">
            <div class="font-semibold text-white mb-1">QR Dinámicos</div>
            <div class="text-xs text-slate-500">Evita capturas de pantalla y falsificaciones.</div>
          </div>
          <div class="p-4">
            <div class="font-semibold text-white mb-1">Escalabilidad Automática</div>
            <div class="text-xs text-slate-500">Soporta picos de tráfico en ventas masivas.</div>
          </div>
          <div class="p-4">
            <div class="font-semibold text-white mb-1">Reportes Auditables</div>
            <div class="text-xs text-slate-500">Transparencia financiera absoluta.</div>
          </div>
          <div class="p-4">
            <div class="font-semibold text-white mb-1">Soporte Operativo</div>
            <div class="text-xs text-slate-500">Acompañamiento especializado en grandes eventos.</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 8. Footer Profesional -->
    <footer class="relative z-10 border-t border-white/[0.05] bg-[#05030a] pt-16 pb-8">
      <div class="mx-auto max-w-7xl px-6 lg:px-8">
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-16">
          <div class="col-span-2 lg:col-span-2">
            <div class="flex items-center gap-2 mb-4">
              <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[10px] font-black text-slate-900">VF</div>
              <span class="text-base font-bold text-white tracking-widest uppercase">{{ appConfig.app.name }}</span>
            </div>
            <p class="text-sm text-slate-500 max-w-xs">
              Plataforma tecnológica para la gestión inteligente de aforos y boletaje.
            </p>
          </div>
          
          <div>
            <h4 class="text-xs font-semibold text-white tracking-wider uppercase mb-4">Producto</h4>
            <ul class="space-y-3 text-sm text-slate-500">
              <li><a href="#" class="hover:text-white transition-colors">Ticketing</a></li>
              <li><a href="#" class="hover:text-white transition-colors">App de Validación</a></li>
              <li><a href="#" class="hover:text-white transition-colors">Dashboard Analítico</a></li>
              <li><a href="#" class="hover:text-white transition-colors">Precios</a></li>
            </ul>
          </div>

          <div>
            <h4 class="text-xs font-semibold text-white tracking-wider uppercase mb-4">Contacto</h4>
            <ul class="space-y-3 text-sm text-slate-500">
              <li><a href="mailto:vitafelixinfo@gmail.com" class="hover:text-white transition-colors">vitafelixinfo@gmail.com</a></li>
              <li><a href="tel:+573184264343" class="hover:text-white transition-colors">+57 318 426 4343</a></li>
              <li><span class="text-slate-600">Lunes a Viernes, 9am - 6pm</span></li>
            </ul>
          </div>

          <div>
            <h4 class="text-xs font-semibold text-white tracking-wider uppercase mb-4">Legal</h4>
            <ul class="space-y-3 text-sm text-slate-500">
              <li><a href="#" class="hover:text-white transition-colors">Términos de servicio</a></li>
              <li><a href="#" class="hover:text-white transition-colors">Privacidad</a></li>
              <li><a href="#" class="hover:text-white transition-colors">Seguridad</a></li>
            </ul>
          </div>
        </div>
        
        <div class="flex flex-col md:flex-row items-center justify-between border-t border-white/[0.05] pt-8">
          <p class="text-xs text-slate-600 mb-4 md:mb-0">
            © {{ year }} {{ appConfig.app.name }} Inc. Todos los derechos reservados.
          </p>
          <div class="flex gap-4 text-slate-600">
            <a href="#" class="hover:text-white transition-colors">
              <span class="sr-only">Twitter</span>
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
            </a>
            <a href="#" class="hover:text-white transition-colors">
              <span class="sr-only">GitHub</span>
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" /></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* Utilidades CSS para animaciones sutiles */
.fade-in-up {
  animation: fadeInUp 1s ease-out forwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.perspective-1000 {
  perspective: 1000px;
}
</style>
