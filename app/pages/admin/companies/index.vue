<script setup lang="ts">
definePageMeta({ requiredRoles: ['SUPER_ADMIN'] })

const { list, update } = useCompanies()

const { data: companies, pending, error, refresh } = await useAsyncData('companies:list', () => list())

const search = ref('')
const statusFilter = ref('')

const filteredCompanies = computed(() => {
  if (!companies.value) return []
  return companies.value.filter((co) => {
    const matchesSearch = co.name.toLowerCase().includes(search.value.toLowerCase()) || 
                          (co.document_number && co.document_number.includes(search.value))
    const matchesStatus = !statusFilter.value || co.status === statusFilter.value
    return matchesSearch && matchesStatus
  })
})

const stats = computed(() => {
  const list = companies.value ?? []
  return {
    total: list.length,
    active: list.filter(c => c.status === 'active').length,
    suspended: list.filter(c => c.status === 'suspended').length,
  }
})

const updatingId = ref<string | null>(null)

async function toggleStatus(company: any) {
  updatingId.value = company.id
  const targetStatus = company.status === 'active' ? 'suspended' : 'active'
  try {
    await update(company.id, { ...company, status: targetStatus })
    await refresh()
  } catch (err) {
    alert('No se pudo actualizar el estado de la empresa.')
  } finally {
    updatingId.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- AppPageHeader -->
    <AppPageHeader
      title="Empresas organizadoras"
      subtitle="Visualiza y administra las empresas aliadas que operan en la plataforma."
    >
      <template #actions>
        <NuxtLink to="/admin/companies/new">
          <AppButton size="md">Crear empresa</AppButton>
        </NuxtLink>
      </template>
    </AppPageHeader>

    <!-- KPIs de Resumen -->
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
      <AppStatCard
        title="Empresas Totales"
        :value="stats.total"
        subtext="Registradas en el sistema"
      />
      <AppStatCard
        title="Empresas Activas"
        :value="stats.active"
        subtext="Operando normalmente"
        trend="up"
        trend-value="OK"
      />
      <AppStatCard
        title="Empresas Suspendidas"
        :value="stats.suspended"
        subtext="Acceso temporal inhabilitado"
        :trend="stats.suspended > 0 ? 'down' : 'neutral'"
        :trend-value="stats.suspended > 0 ? 'Alerta' : ''"
      />
    </div>

    <!-- Barra de Filtros -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
      <div class="flex-1 max-w-sm">
        <AppInput
          v-model="search"
          placeholder="Buscar por nombre o NIT..."
        />
      </div>
      <div class="w-full sm:w-48">
        <AppSelect
          v-model="statusFilter"
          placeholder="Todos los estados"
          :options="[
            { value: 'active', label: 'Activas' },
            { value: 'suspended', label: 'Suspendidas' }
          ]"
        />
      </div>
    </div>

    <!-- Tabla de Contenido -->
    <div v-if="pending" class="text-center py-12 text-slate-500">
      Cargando empresas organizadoras...
    </div>
    <div v-else-if="error" class="text-center py-12 text-rose-600">
      Error al cargar las empresas.
    </div>
    <div v-else-if="filteredCompanies.length === 0" class="py-4">
      <AppEmptyState
        title="No se encontraron empresas"
        description="Prueba con otros criterios de búsqueda o registra una nueva empresa organizadora."
      >
        <template #action>
          <NuxtLink to="/admin/companies/new">
            <AppButton size="sm">Crear primera empresa</AppButton>
          </NuxtLink>
        </template>
      </AppEmptyState>
    </div>
    
    <AppTable v-else>
      <template #headers>
        <th class="px-6 py-3">Empresa</th>
        <th class="px-6 py-3">Plan / Comisión</th>
        <th class="px-6 py-3 text-center">Eventos</th>
        <th class="px-6 py-3 text-center">Usuarios</th>
        <th class="px-6 py-3">Estado</th>
        <th class="px-6 py-3" />
      </template>
      <tr
        v-for="co in filteredCompanies"
        :key="co.id"
        class="hover:bg-slate-50/75 transition-colors"
      >
        <!-- Info Empresa -->
        <td class="px-6 py-4">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-tight shrink-0">
              {{ co.name.substring(0, 2).toUpperCase() }}
            </div>
            <div>
              <p class="font-bold text-slate-900 leading-none mb-1">{{ co.name }}</p>
              <p class="text-xs text-slate-500">{{ co.document_number || 'Sin NIT/Documento' }}</p>
            </div>
          </div>
        </td>
        
        <!-- Plan / Comision -->
        <td class="px-6 py-4 text-xs font-semibold">
          <div>
            <AppBadge :variant="co.plan === 'enterprise' ? 'success' : 'neutral'">
              {{ co.plan.toUpperCase() }}
            </AppBadge>
            <p class="text-[10px] text-slate-400 mt-1">Comisión: {{ co.commission_percentage }}%</p>
          </div>
        </td>

        <!-- Eventos -->
        <td class="px-6 py-4 text-center text-sm font-bold text-slate-700">
          {{ co.eventCount }}
        </td>

        <!-- Usuarios -->
        <td class="px-6 py-4 text-center text-sm font-bold text-slate-700">
          {{ co.userCount }}
        </td>

        <!-- Estado -->
        <td class="px-6 py-4">
          <AppBadge :variant="co.status === 'active' ? 'success' : 'danger'">
            {{ co.status === 'active' ? 'Activa' : 'Suspendida' }}
          </AppBadge>
        </td>

        <!-- Acciones -->
        <td class="px-6 py-4 text-right">
          <div class="flex items-center justify-end gap-3">
            <NuxtLink :to="`/admin/companies/${co.id}`">
              <AppButton variant="outline" size="sm">Editar</AppButton>
            </NuxtLink>
            <AppButton
              :variant="co.status === 'active' ? 'danger' : 'primary'"
              size="sm"
              :loading="updatingId === co.id"
              @click="toggleStatus(co)"
            >
              {{ co.status === 'active' ? 'Suspender' : 'Activar' }}
            </AppButton>
          </div>
        </td>
      </tr>
    </AppTable>
  </div>
</template>
