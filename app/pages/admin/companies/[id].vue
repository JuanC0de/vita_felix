<script setup lang="ts">
definePageMeta({ requiredRoles: ['SUPER_ADMIN'] })

const route = useRoute()
const id = route.params.id as string
const isNew = computed(() => id === 'new')

const { get, create, update } = useCompanies()

const name = ref('')
const legalName = ref('')
const documentNumber = ref('')
const email = ref('')
const phone = ref('')
const city = ref('')
const country = ref('Colombia')
const plan = ref('free')
const status = ref('active')
const maxEvents = ref(3)
const maxUsers = ref(3)
const commissionPercentage = ref(0)

const loading = ref(false)
const error = ref('')

if (!isNew.value) {
  loading.value = true
  try {
    const co = await get(id)
    name.value = co.name
    legalName.value = co.legal_name || ''
    documentNumber.value = co.document_number || ''
    email.value = co.email || ''
    phone.value = co.phone || ''
    city.value = co.city || ''
    country.value = co.country || 'Colombia'
    plan.value = co.plan
    status.value = co.status
    maxEvents.value = co.max_events
    maxUsers.value = co.max_users
    commissionPercentage.value = co.commission_percentage
  } catch (err) {
    error.value = 'No se pudo cargar la información de la empresa.'
  } finally {
    loading.value = false
  }
}

async function onSubmit() {
  if (!name.value.trim()) {
    error.value = 'El nombre comercial es obligatorio.'
    return
  }
  
  loading.value = true
  error.value = ''

  const payload = {
    name: name.value.trim(),
    legalName: legalName.value.trim() || null,
    documentNumber: documentNumber.value.trim() || null,
    email: email.value.trim() || null,
    phone: phone.value.trim() || null,
    city: city.value.trim() || null,
    country: country.value.trim() || 'Colombia',
    plan: plan.value,
    status: status.value,
    maxEvents: maxEvents.value,
    maxUsers: maxUsers.value,
    commissionPercentage: commissionPercentage.value,
  }

  try {
    if (isNew.value) {
      await create(payload)
    } else {
      await update(id, payload)
    }
    await navigateTo('/admin/companies')
  } catch (err: any) {
    error.value = err.data?.message || 'No se pudo guardar la información de la empresa.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl space-y-6">
    <!-- AppPageHeader -->
    <AppPageHeader
      :title="isNew ? 'Registrar nueva empresa' : 'Editar empresa organizadora'"
      :subtitle="isNew ? 'Completa los campos corporativos para dar de alta una nueva empresa en el SaaS.' : 'Modifica la información corporativa y límites operativos de la organización.'"
      :breadcrumbs="[
        { label: 'Empresas', to: '/admin/companies' },
        { label: isNew ? 'Nueva' : name }
      ]"
    />

    <p v-if="error" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 font-medium">
      {{ error }}
    </p>

    <!-- Formulario principal -->
    <AppCard>
      <form class="space-y-6" novalidate @submit.prevent="onSubmit">
        <!-- Datos Comerciales -->
        <div>
          <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
            Información Comercial
          </h3>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AppInput
              v-model="name"
              label="Nombre comercial"
              placeholder="Ej: Eventos Felix"
              required
            />
            <AppInput
              v-model="legalName"
              label="Razón social"
              placeholder="Ej: Eventos Felix S.A.S."
            />
            <AppInput
              v-model="documentNumber"
              label="NIT / Documento tributario"
              placeholder="Ej: 900.123.456-7"
            />
            <AppInput
              v-model="email"
              type="email"
              label="Correo electrónico de contacto"
              placeholder="contacto@empresa.com"
            />
            <AppInput
              v-model="phone"
              label="Teléfono corporativo"
              placeholder="Ej: +57 300 123 4567"
            />
          </div>
        </div>

        <hr class="border-slate-100" />

        <!-- Ubicación -->
        <div>
          <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
            Ubicación
          </h3>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AppInput
              v-model="city"
              label="Ciudad"
              placeholder="Ej: Bogotá"
            />
            <AppInput
              v-model="country"
              label="País"
              placeholder="Colombia"
            />
          </div>
        </div>

        <hr class="border-slate-100" />

        <!-- Configuración Operativa SaaS (Solo Super Admin) -->
        <div>
          <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
            Parámetros y límites operativos (SaaS)
          </h3>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <AppSelect
              v-model="plan"
              label="Plan comercial"
              :options="[
                { value: 'free', label: 'Gratuito (Free)' },
                { value: 'basic', label: 'Básico' },
                { value: 'pro', label: 'Profesional (Pro)' },
                { value: 'enterprise', label: 'Empresarial' }
              ]"
            />
            
            <AppSelect
              v-model="status"
              label="Estado de cuenta"
              :options="[
                { value: 'active', label: 'Activo' },
                { value: 'suspended', label: 'Suspendido' }
              ]"
            />

            <AppInput
              v-model="commissionPercentage"
              type="number"
              label="Comisión por ticket (%)"
              placeholder="0.00"
            />

            <AppInput
              v-model="maxEvents"
              type="number"
              label="Límite de eventos"
              placeholder="3"
            />

            <AppInput
              v-model="maxUsers"
              type="number"
              label="Límite de usuarios"
              placeholder="3"
            />
          </div>
        </div>

        <!-- Botones -->
        <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <NuxtLink to="/admin/companies">
            <AppButton variant="outline" :disabled="loading">Cancelar</AppButton>
          </NuxtLink>
          <AppButton type="submit" :loading="loading">
            {{ isNew ? 'Registrar empresa' : 'Guardar cambios' }}
          </AppButton>
        </div>
      </form>
    </AppCard>
  </div>
</template>
