<!-- Migración de ProductList (Vue 2) a Vue 3 + TS. El original está en docs/dia-02.md. -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Product } from './types'
import { formatCurrency } from './formatCurrency'

const props = defineProps<{ products: Product[] }>()
const search = defineModel<string>('search', { default: '' })
const emit = defineEmits<{ select: [product: Product] }>()

const selectedId = ref<number | null>(null)

const filtered = computed(() =>
  props.products.filter((p) => p.name.toLowerCase().includes(search.value.toLowerCase())),
)
const total = computed(() => filtered.value.reduce((sum, p) => sum + p.price, 0))

function select(product: Product) {
  selectedId.value = product.id
  emit('select', product)
}
</script>

<template>
  <input v-model="search" placeholder="Buscar producto" />
  <ul>
    <li
      v-for="p in filtered"
      :key="p.id"
      :class="{ selected: p.id === selectedId }"
      @click="select(p)"
    >
      {{ p.name }}: {{ formatCurrency(p.price) }}
    </li>
  </ul>
  <p v-if="filtered.length">Total: {{ formatCurrency(total) }}</p>
  <p v-else>Sin resultados</p>
</template>
