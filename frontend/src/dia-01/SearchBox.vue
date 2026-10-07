<!-- v-model en Vue 3: prop `modelValue` + evento `update:modelValue` (antes `value` + `input`). -->
<script setup lang="ts">
const model = defineModel<string>({ default: '' })
</script>

<template>
  <input v-model="model" placeholder="Buscar..." />
</template>
