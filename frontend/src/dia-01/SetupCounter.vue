<!-- Vue 3 / Composition API con <script setup>: el mismo componente. -->
<script setup lang="ts">
import { onMounted } from 'vue'
import { useCounter } from './useCounter'

const props = withDefaults(defineProps<{ start?: number }>(), { start: 0 })
const emit = defineEmits<{ change: [value: number] }>()

const { count, double, inc } = useCounter(props.start, (value) => emit('change', value))

onMounted(() => console.debug('mounted con', count.value))
</script>

<template>
  <button @click="inc">{{ count }} (x2 = {{ double }})</button>
</template>
