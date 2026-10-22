<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import RemoteSlot from './RemoteSlot.vue'

const cart = ref<string[]>([])
const onAdd = (e: Event) => cart.value.push((e as CustomEvent<{ sku: string }>).detail.sku)
window.addEventListener('cart:add', onAdd)
onUnmounted(() => window.removeEventListener('cart:add', onAdd))
</script>

<template>
  <h1>Shell (host)</h1>
  <p data-test="cart">Carrito: {{ cart.length }} {{ cart.join(', ') }}</p>
  <RemoteSlot user="Andres" />
</template>
