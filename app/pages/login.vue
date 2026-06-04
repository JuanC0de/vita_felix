<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { signIn } = useAuth()
const supabaseUser = useSupabaseUser()

const email = ref('')
const password = ref('')
const loading = ref(false)
const fieldError = ref('')
const errorMsg = ref('')

watch(supabaseUser, (user) => {
  if (user) navigateTo('/')
})

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
  if (loading.value) return
  loading.value = true
  try {
    await signIn(email.value.trim(), password.value)
  } catch {
    errorMsg.value = 'Credenciales incorrectas. Revisa e intenta otra vez.'
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <header class="space-y-1 text-center">
      <h1 class="text-2xl font-semibold tracking-tight text-white">
        Iniciar sesión
      </h1>
      <p class="text-sm text-slate-400">
        Entra con tu cuenta de trabajo.
      </p>
    </header>

    <form class="space-y-5" novalidate @submit.prevent="onSubmit">
      <div class="login-field">
        <AppInput
          id="email"
          v-model="email"
          type="email"
          label="Correo"
          placeholder="tu@empresa.com"
          autocomplete="email"
          required
        />
      </div>

      <div class="login-field">
        <AppInput
          id="password"
          v-model="password"
          type="password"
          label="Contraseña"
          placeholder="••••••••"
          autocomplete="current-password"
          required
        />
      </div>

      <p
        v-if="fieldError"
        role="alert"
        class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-200"
      >
        {{ fieldError }}
      </p>

      <p
        v-if="errorMsg"
        role="alert"
        class="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200"
      >
        {{ errorMsg }}
      </p>

      <AppButton
        type="submit"
        :loading="loading"
        size="lg"
        class="login-submit w-full !rounded-xl !border-0 !bg-gradient-to-r !from-violet-600 !to-indigo-600 !py-3 !text-base !font-semibold !text-white shadow-lg shadow-violet-600/25 hover:!from-violet-500 hover:!to-indigo-500 focus:!ring-violet-400/50 motion-safe:active:scale-[0.99]"
      >
        Entrar
      </AppButton>
    </form>
  </div>
</template>

<style scoped>
.login-field :deep(label) {
  color: rgb(203 213 225);
}

.login-field :deep(input) {
  border-color: rgb(255 255 255 / 0.12);
  background-color: rgb(255 255 255 / 0.06);
  color: rgb(248 250 252);
}

.login-field :deep(input::placeholder) {
  color: rgb(148 163 184 / 0.7);
}

.login-field :deep(input:focus) {
  border-color: rgb(167 139 250 / 0.6);
  --tw-ring-color: rgb(167 139 250 / 0.35);
}

.login-field :deep(span.text-rose-500) {
  color: rgb(251 191 36);
}
</style>
