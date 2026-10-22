<!-- Un "remote" de juguete: lo que expondría otro equipo. -->
<script setup lang="ts">
import { emit } from './events'

defineProps<{ user: string }>()
</script>

<template>
  <p>Hola, {{ user }}</p>
  <button type="button" @click="emit('cart:add', { sku: 'ABC-1', qty: 1 })">Agregar al carrito</button>
</template>
