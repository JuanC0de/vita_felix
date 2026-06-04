<script setup lang="ts">
definePageMeta({ requiredRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN'] })

const { authContext } = useAuth()
const { list: listUsers, invite: inviteUser, update: updateUser } = useUsers()
const { list: listCompanies } = useCompanies()

const isSuperAdmin = computed(() => authContext.value?.role === 'SUPER_ADMIN')
const currentCompanyId = computed(() => authContext.value?.companyId)

const { data: users, pending: usersPending, error: usersError, refresh: refreshUsers } = await useAsyncData('users:list', () => listUsers())
const { data: companies } = await useAsyncData('companies:dropdown', () => isSuperAdmin.value ? listCompanies() : Promise.resolve([]))

const search = ref('')
const roleFilter = ref('')
const companyFilter = ref('')

const filteredUsers = computed(() => {
  if (!users.value) return []
  return users.value.filter((u) => {
    const matchesSearch = u.fullName.toLowerCase().includes(search.value.toLowerCase()) || 
                          u.email.toLowerCase().includes(search.value.toLowerCase())
    const matchesRole = !roleFilter.value || u.role === roleFilter.value
    
    // Si filtra por empresa (Super Admin)
    const matchesCompany = !companyFilter.value || u.companies.some((c: any) => c.companyId === companyFilter.value)
    
    return matchesSearch && matchesRole && matchesCompany
  })
})

// Variables del Modal de Invitación
const showInviteModal = ref(false)
const inviteEmail = ref('')
const invitePassword = ref('')
const inviteFullName = ref('')
const inviteRole = ref('EVENT_MANAGER')
const inviteCompanyId = ref(isSuperAdmin.value ? '' : currentCompanyId.value || '')

const inviteLoading = ref(false)
const inviteError = ref('')

// Formulario de edición rápida
const showEditModal = ref(false)
const editUserId = ref('')
const editFullName = ref('')
const editRole = ref('')
const editStatus = ref('')
const editCompanyId = ref('')

const editLoading = ref(false)
const editError = ref('')

async function onInvite() {
  if (!inviteEmail.value.trim() || !invitePassword.value || !inviteFullName.value.trim() || !inviteRole.value) {
    inviteError.value = 'Completa todos los campos obligatorios.'
    return
  }
  
  inviteLoading.value = true
  inviteError.value = ''
  
  try {
    await inviteUser({
      email: inviteEmail.value.trim(),
      password: invitePassword.value,
      fullName: inviteFullName.value.trim(),
      role: inviteRole.value,
      companyId: inviteCompanyId.value || null,
    })
    
    // Limpiar campos
    inviteEmail.value = ''
    invitePassword.value = ''
    inviteFullName.value = ''
    showInviteModal.value = false
    await refreshUsers()
  } catch (err: any) {
    inviteError.value = err.data?.message || 'No se pudo crear/invitar el usuario.'
  } finally {
    inviteLoading.value = false
  }
}

function openEdit(user: any) {
  editUserId.value = user.id
  editFullName.value = user.fullName || ''
  
  // Buscar rol y estado en la empresa activa/filtrada
  const activeCoId = isSuperAdmin.value ? user.companyId : currentCompanyId.value
  const membership = user.companies.find((c: any) => c.companyId === activeCoId)
  
  editRole.value = membership?.role || user.role
  editStatus.value = membership?.status || 'active'
  editCompanyId.value = activeCoId || ''
  
  showEditModal.value = true
}

async function onUpdate() {
  editLoading.value = true
  editError.value = ''
  
  try {
    await updateUser(editUserId.value, editCompanyId.value, {
      role: editRole.value,
      status: editStatus.value,
    })
    showEditModal.value = false
    await refreshUsers()
  } catch (err: any) {
    editError.value = err.data?.message || 'No se pudo actualizar el usuario.'
  } finally {
    editLoading.value = false
  }
}

const roleOptions = [
  { value: 'SUPER_ADMIN', label: 'Super Administrador' },
  { value: 'COMPANY_ADMIN', label: 'Administrador de Empresa' },
  { value: 'EVENT_MANAGER', label: 'Gestor de Eventos' },
  { value: 'GATE_STAFF', label: 'Personal de Acceso (Portería)' },
]
</script>

<template>
  <div class="space-y-6">
    <!-- AppPageHeader -->
    <AppPageHeader
      title="Gestión de usuarios"
      subtitle="Invita a nuevos miembros a la organización y administra sus roles y permisos."
    >
      <template #actions>
        <AppButton size="md" @click="showInviteModal = true">Invitar usuario</AppButton>
      </template>
    </AppPageHeader>

    <!-- Barra de Filtros -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
      <AppInput
        v-model="search"
        placeholder="Buscar por nombre o correo..."
      />
      <AppSelect
        v-model="roleFilter"
        placeholder="Todos los roles"
        :options="roleOptions"
      />
      <AppSelect
        v-if="isSuperAdmin"
        v-model="companyFilter"
        placeholder="Todas las empresas"
        :options="(companies ?? []).map(c => ({ value: c.id, label: c.name }))"
      />
    </div>

    <!-- Tabla de Contenido -->
    <div v-if="usersPending" class="text-center py-12 text-slate-500">
      Cargando usuarios...
    </div>
    <div v-else-if="usersError" class="text-center py-12 text-rose-600">
      Error al cargar los usuarios.
    </div>
    <div v-else-if="filteredUsers.length === 0" class="py-4">
      <AppEmptyState
        title="No se encontraron usuarios"
        description="Registra nuevos miembros en la empresa para empezar a delegar operaciones."
      >
        <template #action>
          <AppButton size="sm" @click="showInviteModal = true">Invitar primer usuario</AppButton>
        </template>
      </AppEmptyState>
    </div>

    <AppTable v-else>
      <template #headers>
        <th class="px-6 py-3">Nombre</th>
        <th class="px-6 py-3">Rol Principal</th>
        <th class="px-6 py-3">Empresas Asociadas</th>
        <th class="px-6 py-3">Estado</th>
        <th class="px-6 py-3" />
      </template>
      <tr
        v-for="u in filteredUsers"
        :key="u.id"
        class="hover:bg-slate-50/75 transition-colors"
      >
        <!-- Nombre / Email -->
        <td class="px-6 py-4">
          <div>
            <p class="font-bold text-slate-900 leading-none mb-1">{{ u.fullName || 'Sin nombre' }}</p>
            <p class="text-xs text-slate-500">{{ u.email }}</p>
          </div>
        </td>

        <!-- Rol Principal -->
        <td class="px-6 py-4 text-xs font-semibold text-slate-700">
          <AppBadge :variant="u.role === 'SUPER_ADMIN' ? 'success' : 'neutral'">
            {{ u.role }}
          </AppBadge>
        </td>

        <!-- Empresas -->
        <td class="px-6 py-4 text-xs">
          <div class="flex flex-wrap gap-1 max-w-xs">
            <span
              v-for="co in u.companies"
              :key="co.companyId"
              class="inline-flex items-center rounded-sm bg-slate-50 border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600"
            >
              {{ co.companyName }} ({{ co.role }})
            </span>
            <span v-if="u.companies.length === 0" class="text-slate-400">Sin empresa (Global)</span>
          </div>
        </td>

        <!-- Estado -->
        <td class="px-6 py-4">
          <AppBadge
            :variant="u.companies.some((c: any) => c.status === 'active') || u.role === 'SUPER_ADMIN' ? 'success' : 'danger'"
          >
            {{ u.companies.some((c: any) => c.status === 'active') || u.role === 'SUPER_ADMIN' ? 'Activo' : 'Suspendido' }}
          </AppBadge>
        </td>

        <!-- Acciones -->
        <td class="px-6 py-4 text-right">
          <AppButton variant="outline" size="sm" @click="openEdit(u)">
            Administrar
          </AppButton>
        </td>
      </tr>
    </AppTable>

    <!-- MODAL DE INVITACIÓN (CREAR USUARIO) -->
    <Teleport to="body">
      <div v-if="showInviteModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" @click="!inviteLoading && (showInviteModal = false)" />
        <div class="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all border border-slate-100 space-y-4">
          <h3 class="text-lg font-bold text-slate-900">Invitar nuevo usuario</h3>
          
          <p v-if="inviteError" class="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
            {{ inviteError }}
          </p>

          <div class="space-y-4">
            <AppInput v-model="inviteFullName" label="Nombre completo" placeholder="Ej: Juan Pérez" required />
            <AppInput v-model="inviteEmail" type="email" label="Correo electrónico" placeholder="juan@empresa.com" required />
            <AppInput v-model="invitePassword" type="password" label="Contraseña temporal" placeholder="Contraseña segura" required />
            <AppSelect v-model="inviteRole" label="Rol del usuario" :options="roleOptions" required />
            
            <AppSelect
              v-if="isSuperAdmin"
              v-model="inviteCompanyId"
              label="Empresa"
              :options="(companies ?? []).map(c => ({ value: c.id, label: c.name }))"
              placeholder="Asociación Global (Sin empresa)"
            />
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <AppButton variant="outline" :disabled="inviteLoading" @click="showInviteModal = false">
              Cancelar
            </AppButton>
            <AppButton :loading="inviteLoading" @click="onInvite">
              Registrar usuario
            </AppButton>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL DE EDICIÓN RÁPIDA (ROL Y ESTADO) -->
    <Teleport to="body">
      <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" @click="!editLoading && (showEditModal = false)" />
        <div class="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all border border-slate-100 space-y-4">
          <h3 class="text-lg font-bold text-slate-900">Administrar usuario</h3>
          <p class="text-sm text-slate-500">
            Ajusta los privilegios de <span class="font-bold text-slate-700">{{ editFullName }}</span>.
          </p>

          <p v-if="editError" class="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
            {{ editError }}
          </p>

          <div class="space-y-4">
            <AppSelect v-model="editRole" label="Rol en la organización" :options="roleOptions" required />
            
            <AppSelect
              v-model="editStatus"
              label="Estado de membresía"
              :options="[
                { value: 'active', label: 'Activo' },
                { value: 'suspended', label: 'Suspendido' }
              ]"
              required
            />
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <AppButton variant="outline" :disabled="editLoading" @click="showEditModal = false">
              Cancelar
            </AppButton>
            <AppButton :loading="editLoading" @click="onUpdate">
              Guardar cambios
            </AppButton>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
