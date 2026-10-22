<script setup lang="ts">
const props = defineProps<{ user: string }>()
const products = [
  { sku: 'ABC-1', name: 'Teclado' },
  { sku: 'ABC-2', name: 'Mouse' },
]

function add(sku: string) {
  window.dispatchEvent(new CustomEvent('cart:add', { detail: { sku, qty: 1 } }))
}
</script>

<template>
  <section class="catalog">
    <h2>Catálogo (remote) para {{ props.user }}</h2>
    <ul>
      <li v-for="p in products" :key="p.sku">
        {{ p.name }} <button type="button" @click="add(p.sku)">Agregar</button>
      </li>
    </ul>
  </section>
</template>
