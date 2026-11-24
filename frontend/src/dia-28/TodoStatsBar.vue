<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchStats, type TodoStats } from './stats'

const stats = ref<TodoStats>()
const error = ref('')

async function refresh() {
  try {
    stats.value = await fetchStats()
    error.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

onMounted(refresh)
defineExpose({ refresh })
</script>

<template>
  <p v-if="error" role="alert">Sin stats: {{ error }}</p>
  <p v-else-if="stats" aria-live="polite">
    Hechas: {{ stats.done }} de {{ stats.total }}. Pendientes: {{ stats.pending }}.
    <button type="button" @click="refresh">Actualizar</button>
  </p>
</template>
