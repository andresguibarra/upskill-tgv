<!-- Captura errores de render/setup de los hijos y muestra un fallback. -->
<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue'

const error = ref<Error | null>(null)

onErrorCaptured((err) => {
  error.value = err instanceof Error ? err : new Error(String(err))
  return false // no propaga a app.config.errorHandler
})
</script>

<template>
  <p v-if="error" role="alert">Algo falló: {{ error.message }}</p>
  <slot v-else />
</template>
