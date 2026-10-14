# Día 4: Vue 3 + TypeScript avanzado

Props y emits avanzados, interfaces, utility types, uniones discriminadas, componentes genéricos y slots tipados. El código está en [`frontend/src/dia-04/`](../frontend/src/dia-04/).

## Interfaces y utility types

```ts
interface User extends Entity { name: string; role: 'admin' | 'editor' | 'viewer' }
type UserDraft = Omit<User, 'id'>                        // alta
type UserPatch = Partial<UserDraft> & Pick<User, 'id'>   // edición parcial
```

> Un solo `interface` es la fuente de verdad, y las variantes se derivan con `Omit`, `Partial` y `Pick`. Si `User` cambia, los formularios se enteran en compilación.

## Unión discriminada

```ts
type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string }

if (state.status === 'ok') state.data // ✅ solo existe acá
```

> El campo literal (`status`) le permite a TS angostar el tipo en cada rama. Evita los `data?` y `error?` opcionales que pueden quedar en estados imposibles.

## Props avanzadas

```ts
withDefaults(defineProps<{
  items: T[]
  size?: 'sm' | 'md'            // unión literal: solo esos valores
  disabledIds?: T['id'][]       // indexed access type
}>(), { size: 'md', disabledIds: () => [] })  // arrays/objetos: siempre factory
```

> Los defaults de arrays y objetos van como función para que cada instancia tenga su propia copia. `T['id']` reutiliza el tipo del id, sea `number` o `string`.

## Componente genérico

```vue
<script setup lang="ts" generic="T extends Entity">
const props = defineProps<{ items: T[] }>()
const selected = defineModel<T | null>()
const emit = defineEmits<{ select: [item: T] }>()
</script>

<!-- uso: T = User se infiere de :items -->
<SelectList :items="users" @select="(u) => u.email" />
```

> `generic="..."` funciona igual que `function f<T>()`. El tipo se infiere en cada uso, así que el evento, el `v-model` y el slot reciben `User` y no `unknown`.

## Slots tipados

```ts
defineSlots<{ item(props: { item: T; selected: boolean }): unknown }>()
```
```vue
<template #item="{ item, selected }">{{ item.name }}</template>
```

> Así el padre tiene autocompletado y chequeo de las props del slot. Sin `defineSlots`, son `any`.

## `defineExpose` + `useTemplateRef`

```ts
// hijo
defineExpose({ clear: () => (selected.value = null) })
// padre
const list = useTemplateRef<{ clear: () => void }>('list')
list.value?.clear()
```

> En `<script setup>` los componentes son cerrados por defecto. `defineExpose` define la API pública y `useTemplateRef` (3.5+) reemplaza a `ref(null)` + `ref="..."`.

## Documentación oficial

- [Vue: TypeScript con Composition API](https://vuejs.org/guide/typescript/composition-api.html) (el recurso del plan)
- [Componentes genéricos (`generic`)](https://vuejs.org/api/sfc-script-setup.html#generics)
- [`defineSlots`](https://vuejs.org/api/sfc-script-setup.html#defineslots)
- [Template refs y `useTemplateRef`](https://vuejs.org/guide/essentials/template-refs.html)
- [TypeScript: utility types](https://www.typescriptlang.org/docs/handbook/utility-types.html) y [narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)
