# Día 1: Vue 2 → Vue 3

Ayuda memoria: Composition API, `<script setup>` y composables. El código está en [`frontend/src/dia-01/`](../frontend/src/dia-01/).

## Options API → `<script setup>`

```ts
// Vue 2 (Options API)
data() { return { count: 0 } },
computed: { double() { return this.count * 2 } },
watch: { count(v) { this.$emit('change', v) } },
mounted() { /* ... */ },
methods: { inc() { this.count++ } },
```

```ts
// Vue 3 (<script setup lang="ts">)
const count = ref(0)
const double = computed(() => count.value * 2)
watch(count, (v) => emit('change', v))
onMounted(() => { /* ... */ })
const inc = () => count.value++
```

> Todo lo que se declara en `<script setup>` queda disponible en el template, sin `return` ni `this`. `ref` envuelve el valor: en el script se usa `.value` y en el template se desenvuelve solo.

## Props y emits tipados

```ts
const props = withDefaults(defineProps<{ start?: number }>(), { start: 0 })
const emit = defineEmits<{ change: [value: number] }>()
```

> `defineProps` y `defineEmits` son macros del compilador, así que no se importan. El tipado sale del genérico; `withDefaults` pone los valores por defecto.

## Composable (reemplaza a los mixins)

```ts
export function useCounter(start = 0) {
  const count = ref(start)
  const double = computed(() => count.value * 2)
  return { count, double, inc: () => count.value++ }
}
// en el componente
const { count, double, inc } = useCounter(props.start)
```

> Es una función `useX` que devuelve refs. A diferencia de los mixins, no hay choque de nombres y se ve de dónde viene cada cosa. También se puede testear sin montar un componente.

## v-model

```vue
<!-- hijo -->
<script setup lang="ts">
const model = defineModel<string>({ default: '' })
</script>
<template><input v-model="model" /></template>

<!-- padre -->
<SearchBox v-model="search" />
```

> En Vue 3, `v-model` usa la prop `modelValue` y el evento `update:modelValue` (antes eran `value` e `input`). `.sync` desaparece: ahora se escribe `v-model:titulo`. `defineModel` (3.4+) arma todo eso en una línea.

## Cambios que rompen al migrar

| Vue 2 | Vue 3 |
|---|---|
| `new Vue({ render })` | `createApp(App).mount('#app')` |
| `Vue.set` / `Vue.delete` | No hacen falta, porque la reactividad usa Proxy |
| Filtros `{{ x \| moneda }}` | Eliminados: se usa una función o un `computed` |
| `$on` / `$off` (event bus) | Eliminados: se usa `mitt` o un store |
| `$listeners` | Se fusionó en `$attrs` |
| `v-for` gana sobre `v-if` | Ahora `v-if` gana, así que conviene no mezclarlos en el mismo elemento |
| Un solo nodo raíz | Se permiten varios nodos raíz (fragments) |

## Documentación oficial

- [Vue: TypeScript con Composition API](https://vuejs.org/guide/typescript/composition-api.html) (el recurso del plan)
- [Composition API FAQ](https://vuejs.org/guide/extras/composition-api-faq.html)
- [`<script setup>`](https://vuejs.org/api/sfc-script-setup.html)
- [Composables](https://vuejs.org/guide/reusability/composables.html)
- [Guía de migración: cambios que rompen](https://v3-migration.vuejs.org/breaking-changes/)
