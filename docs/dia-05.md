# Día 5: composables, APIs y manejo de errores

Cliente HTTP tipado, un `useFetch` reactivo que cancela pedidos viejos, y errores en tres niveles: la llamada, el componente y la app. El código está en [`frontend/src/dia-05/`](../frontend/src/dia-05/).

## Cliente HTTP tipado

```ts
export class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message) }
}
export async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) throw new ApiError(res.status, res.statusText)
  return (await res.json()) as T
}
const user = await http<User>('/api/users/1')
```

> `fetch` no falla con un 4xx o 5xx, así que hay que revisar `res.ok` a mano. Una clase de error propia con `status` permite distinguir un 404 de un 500 con `instanceof` y no parseando strings.

## `useFetch` con URL reactiva y cancelación

```ts
export function useFetch<T>(url: MaybeRefOrGetter<string>) {
  const data = shallowRef<T | null>(null)
  watch(() => toValue(url), () => {
    const controller = new AbortController()
    onWatcherCleanup(() => controller.abort())   // aborta el pedido anterior
    void load(controller.signal)
  }, { immediate: true })
  return { data, error, loading, refetch }
}
const { data } = useFetch<User>(() => `/api/users/${id.value}`)
```

> `MaybeRefOrGetter` + `toValue` hacen que el composable acepte un string, un `ref` o un getter. `onWatcherCleanup` (3.5+) corre antes del siguiente disparo, así una respuesta vieja nunca pisa a la nueva (race condition).

## Error boundary con `onErrorCaptured`

```ts
const error = ref<Error | null>(null)
onErrorCaptured((err) => { error.value = err as Error; return false })
```
```vue
<p v-if="error" role="alert">Algo falló: {{ error.message }}</p>
<slot v-else />
```

> Captura errores de setup, render, watchers y hooks de los hijos. Si devuelve `false`, el error no sigue subiendo. Los errores dentro de un `await` en un handler de click **no** llegan acá, así que eso se maneja con `try/catch` en el lugar.

## Handler global

```ts
app.config.errorHandler = (err, instance, info) => {
  reportToSentry(err, { component: instance?.$options.name, info })
}
```

> Es la última red: recibe todo lo que no atrapó un `onErrorCaptured`. Sirve para logging y monitoreo, no para la UI.

## Dónde manejar cada error

| Error | Dónde |
|---|---|
| HTTP 4xx/5xx | `ApiError` en el cliente, expuesto como `error` en el composable |
| Pedido cancelado | Se ignora (`signal.aborted`) |
| Fallo de render o setup de un hijo | `onErrorCaptured` (error boundary) |
| Async en event handlers | `try/catch` en el handler |
| Todo lo demás | `app.config.errorHandler` → logging |

## Documentación oficial

- [Vue: TypeScript con Composition API](https://vuejs.org/guide/typescript/composition-api.html) (el recurso del plan)
- [Composables (incluye el ejemplo de `useFetch`)](https://vuejs.org/guide/reusability/composables.html)
- [Watchers y `onWatcherCleanup`](https://vuejs.org/guide/essentials/watchers.html#side-effect-cleanup)
- [`onErrorCaptured`](https://vuejs.org/api/composition-api-lifecycle.html#onerrorcaptured) y [`app.config.errorHandler`](https://vuejs.org/api/application.html#app-config-errorhandler)
- [MDN: `AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
