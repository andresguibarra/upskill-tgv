# Día 6: módulo CRUD tipado (entregable del bloque 2)

Un CRUD genérico en cuatro piezas: tipos, un contrato `Repository<T>`, dos implementaciones (memoria y HTTP) y un composable `useCrud<T>` que usa la UI. El código está en [`frontend/src/dia-06/`](../frontend/src/dia-06/) y la demo en `App.vue`.

## Tipos derivados de la entidad

```ts
interface Todo extends Entity { title: string; done: boolean }
type Draft<T extends Entity> = Omit<T, 'id'>        // alta
type Patch<T extends Entity> = Partial<Draft<T>>    // edición
```

> Se define la entidad una vez y el resto se deriva con utility types. Si mañana `Todo` suma un campo, el alta y la edición lo toman solas.

## El contrato: `Repository<T>`

```ts
interface Repository<T extends Entity> {
  list(): Promise<T[]>
  create(draft: Draft<T>): Promise<T>
  update(id: T['id'], patch: Patch<T>): Promise<T>
  remove(id: T['id']): Promise<void>
}
```

> La UI depende de la interfaz, no de `fetch`. `T['id']` (indexed access type) mantiene el tipo del id aunque cambie de `number` a `string`.

## Dos implementaciones del mismo contrato

```ts
const repo = createMemoryRepository<Todo>([{ id: 1, title: 'Leer docs', done: false }])
const repo = createHttpRepository<Todo>('/api/todos')   // GET, POST, PATCH /:id, DELETE /:id
```

> La de memoria sirve para la demo y los tests; la de HTTP reusa `http<T>` y `ApiError` del día 5. En el bloque 5 la de HTTP va a apuntar a la API de ASP.NET Core.

## `useCrud<T>` con borrado optimista

```ts
const { items, error, loading, load, create, update, remove } = useCrud(repo)

async function remove(id: T['id']) {
  const before = items.value
  items.value = before.filter((i) => i.id !== id)   // la UI responde ya
  const ok = await run(() => repo.remove(id).then(() => true))
  if (!ok) items.value = before                      // rollback si el server falla
}
```

> `run()` centraliza `loading` y `error` para todas las operaciones. `loading` es un contador (`pending > 0`) para que dos pedidos en paralelo no se pisen el flag. `ref([]) as Ref<T[]>` evita que el genérico se "desenvuelva" a `UnwrapRef<T>[]`.

## El componente

```vue
<script setup lang="ts">
const props = defineProps<{ repo: Repository<Todo> }>()
const { items, create, update, remove, load } = useCrud(props.repo)
onMounted(load)
</script>
```

> Inyectar el repo por prop (o con `provide`/`inject`, como en el día 3) es lo que permite testear `TodoCrud` sin red.

## Documentación oficial

- [Vue: TypeScript con Composition API](https://vuejs.org/guide/typescript/composition-api.html) (el recurso del plan)
- [Composables](https://vuejs.org/guide/reusability/composables.html)
- [TS: utility types](https://www.typescriptlang.org/docs/handbook/utility-types.html) e [indexed access types](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html)
- [TS: generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
