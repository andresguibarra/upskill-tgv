<!-- Carga el remote en runtime; si no responde, muestra un fallback y el host sigue andando. -->
<script setup lang="ts">
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue'

const props = defineProps<{ user: string }>()
const el = useTemplateRef<HTMLElement>('el')
const failed = ref(false)
let unmount: (() => void) | undefined

onMounted(async () => {
  try {
    const remote = await import('catalog/mfe')
    remote.mount(el.value!, { user: props.user })
    unmount = remote.unmount
  } catch {
    failed.value = true
  }
})
onUnmounted(() => unmount?.())
</script>

<template>
  <p v-if="failed" role="alert">El catálogo no está disponible.</p>
  <div ref="el" />
</template>
