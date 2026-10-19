<!-- Emite `search` 300 ms después de la última tecla. -->
<script setup lang="ts">
import { onUnmounted, ref } from 'vue'

const props = withDefaults(defineProps<{ delay?: number }>(), { delay: 300 })
const emit = defineEmits<{ search: [term: string] }>()
const term = ref('')
let timer: ReturnType<typeof setTimeout> | undefined

function onInput() {
  clearTimeout(timer)
  timer = setTimeout(() => emit('search', term.value.trim()), props.delay)
}

onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <input v-model="term" type="search" @input="onInput" />
</template>
