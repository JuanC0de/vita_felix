<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { signIn } = useAuth()

const email = ref('')
const password = ref('')
const loading = ref(false)
const fieldError = ref('')
const errorMsg = ref('')

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(): boolean {
  if (!email.value.trim() || !password.value) {
    fieldError.value = 'Completa el correo y la contraseña.'
    return false
  }
  if (!EMAIL_RE.test(email.value.trim())) {
    fieldError.value = 'El correo no tiene un formato válido.'
    return false
  }
  fieldError.value = ''
  return true
}

async function onSubmit() {
  errorMsg.value = ''
  if (!validate()) return
  if (loading.value) return // evita envíos duplicados (req. 5.3)
  loading.value = true
  try {
    await signIn(email.value.trim(), password.value)
    await navigateTo('/')
  } catch {
    // Mensaje genérico: no revela si falló usuario o contraseña (req. 2.2).
    errorMsg.value = 'Credenciales inválidas. Verifica e intenta de nuevo.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form class="space-y-4" novalidate @submit.prevent="onSubmit">
    <div>
      <label for="email" class="mb-1 block text-sm font-medium text-slate-700">Correo</label>
      <input
        id="email"
        v-model="email"
        type="email"
        autocomplete="email"
        class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
      >
    </div>
    <div>
      <label for="password" class="mb-1 block text-sm font-medium text-slate-700">Contraseña</label>
      <input
        id="password"
        v-model="password"
        type="password"
        autocomplete="current-password"
        class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
      >
    </div>

    <p v-if="fieldError" class="text-sm text-amber-700">{{ fieldError }}</p>
    <p v-if="errorMsg" class="text-sm text-red-600">{{ errorMsg }}</p>

    <button
      type="submit"
      :disabled="loading"
      class="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {{ loading ? 'Ingresando…' : 'Iniciar sesión' }}
    </button>
  </form>
</template>
