<script setup lang="ts">
// Callback del flujo PKCE de Supabase. Cuando la sesión queda establecida,
// redirige al Dashboard.
definePageMeta({ layout: 'auth' })

const user = useSupabaseUser()

watch(
  user,
  (value) => {
    if (value) navigateTo('/')
  },
  { immediate: true },
)
</script>

<template>
  <p class="text-center text-sm text-slate-600">Confirmando tu sesión…</p>
</template>
