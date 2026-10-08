# Día 2: migrar un componente Vue 2 a Vue 3 + TypeScript

El caso es un `ProductList` típico de Vue 2, con filtro de moneda, `v-model` con `value`/`input` y un event bus. Abajo está el original, el resultado y qué cambió en cada parte. El código migrado está en [`frontend/src/dia-02/`](../frontend/src/dia-02/).

## Antes (Vue 2)

```vue
<template>
  <div>
    <input :value="value" @input="$emit('input', $event.target.value)" />
    <ul>
      <li v-for="p in filtered" :key="p.id" @click="select(p)">
        {{ p.name }}: {{ p.price | currency }}
      </li>
    </ul>
    <p>Total: {{ total | currency }}</p>
  </div>
</template>

<script>
import EventBus from '@/eventBus'

export default {
  props: { value: String, products: Array },
  filters: { currency: (v) => '$' + v.toFixed(2) },
  data: () => ({ selectedId: null }),
  computed: {
    filtered() {
      return this.products.filter((p) => p.name.toLowerCase().includes(this.value.toLowerCase()))
    },
    total() {
      return this.filtered.reduce((sum, p) => sum + p.price, 0)
    },
  },
  methods: {
    select(p) {
      this.selectedId = p.id
      EventBus.$emit('product-selected', p)
    },
  },
}
</script>
```

## Después (Vue 3 + TS)

```ts
const props = defineProps<{ products: Product[] }>()
const search = defineModel<string>('search', { default: '' })
const emit = defineEmits<{ select: [product: Product] }>()

const filtered = computed(() =>
  props.products.filter((p) => p.name.toLowerCase().includes(search.value.toLowerCase())),
)
const total = computed(() => filtered.value.reduce((sum, p) => sum + p.price, 0))
```

```vue
<input v-model="search" />
<li v-for="p in filtered" :key="p.id" @click="select(p)">
  {{ p.name }}: {{ formatCurrency(p.price) }}
</li>
```

## Qué cambió y por qué

| Vue 2 | Vue 3 + TS |
|---|---|
| `props: { products: Array }` | `defineProps<{ products: Product[] }>()` |
| `value` + `$emit('input')` | `defineModel('search')`, que el padre usa como `v-model:search` |
| `filters: { currency }` | Función pura `formatCurrency()` con `Intl.NumberFormat` |
| `EventBus.$emit(...)` | `emit('select', p)`, y el padre decide qué hacer |
| Un solo `<div>` raíz obligatorio | Varios nodos raíz (fragment) |
| `data`, `computed` y `methods` separados | `ref` y `computed` agrupados por funcionalidad |

> **Tipos primero.** Conviene definir `interface Product` antes de tocar el componente. Con eso, `defineProps` valida en compilación y `computed` infiere el resto.

> **`v-model` con nombre.** `defineModel('search')` expone la prop `search` y el evento `update:search`. Así un componente puede tener varios `v-model` sin usar `.sync`.

> **Sin event bus.** `$on`/`$off`/`$emit` en una instancia global ya no existen. Si la comunicación es entre padre e hijo, alcanza con un evento tipado. Si es global, se usa un store (Pinia) o `mitt`.

> **Filtros → funciones.** Una función se puede testear, tipar y reutilizar fuera del template.

## Checklist para migrar

1. Tipar el modelo de datos (`interface`).
2. Pasar `props` y `emits` a `defineProps` y `defineEmits` con genéricos.
3. Cambiar `value`/`input` por `defineModel`.
4. Pasar `data` a `ref`, `computed` a `computed()` y `methods` a funciones.
5. Reemplazar filtros, event bus y mixins por funciones, eventos o stores, y composables.
6. Escribir un test del comportamiento antes y después.

## Documentación oficial

- [Vue: TypeScript con Composition API](https://vuejs.org/guide/typescript/composition-api.html) (el recurso del plan)
- [Component v-model y `defineModel`](https://vuejs.org/guide/components/v-model.html)
- [Migración: filtros eliminados](https://v3-migration.vuejs.org/breaking-changes/filters.html)
- [Migración: `$on`/`$off` eliminados](https://v3-migration.vuejs.org/breaking-changes/events-api.html)
- [Migración: cambios en `v-model`](https://v3-migration.vuejs.org/breaking-changes/v-model.html)
