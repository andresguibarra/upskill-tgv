# Día 9: suite de tests del módulo CRUD (entregable del bloque 3)

Son 17 tests sobre el módulo CRUD del día 6, en [`frontend/src/dia-06/__tests__/bloque-3.spec.ts`](../frontend/src/dia-06/__tests__/bloque-3.spec.ts). Con los de los días anteriores, el repo tiene 48 tests. Se corren con `npm run test:unit`, y con `npm run coverage` sale la cobertura.

## Qué cubre

| Pieza | Tests | Qué se verifica |
| --- | --- | --- |
| Repo en memoria | 4 | ids (vacío y con seed), `update` parcial, 404 con `ApiError` |
| Repo HTTP | 4 | verbo, URL y body de cada operación, 204 sin body, 500 como `ApiError` |
| `useCrud` | 5 | `loading` con pedidos en paralelo, alta y edición, borrado optimista, limpiar el error |
| `TodoCrud.vue` | 4 | no agrega vacíos, muestra el error, deshabilita mientras carga, borra |

## Un patrón nuevo: la promesa "deferred"

```ts
function deferred<T = void>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => (resolve = res))
  return { promise, resolve }
}

const server = deferred()
const crud = useCrud({ ...repo, remove: () => server.promise })
const pending = crud.remove(1)
expect(crud.items.value.map((t) => t.id)).toEqual([5])   // ya se fue, el server no respondió
server.resolve()
await pending
```

> Sirve para probar el estado "en vuelo" (spinners, botones deshabilitados, UI optimista) sin timers ni sleeps: el test decide cuándo responde el server.

## El bug que encontró la suite

`http()` del día 5 hacía `res.json()` siempre, así que un `DELETE` que responde **204 No Content** tiraba `SyntaxError: Unexpected end of JSON input`. Lo detectó el test "remove acepta un 204 sin body", y el arreglo es una línea en [`dia-05/http.ts`](../frontend/src/dia-05/http.ts):

```ts
if (res.status === 204) return undefined as T
```

> Por eso conviene testear contra respuestas realistas (`new Response(null, { status: 204 })`) y no solo contra el caso feliz con JSON.

## Cobertura

```ts
// vitest.config.ts
coverage: { provider: 'v8', include: ['src/**/*.{ts,vue}'], exclude: ['src/**/__tests__/**', 'src/main.ts'] }
```

| | Statements | Branches | Funciones | Líneas |
| --- | --- | --- | --- | --- |
| Todo `src/` | 97,75 % | 92,4 % | 95,45 % | 98,93 % |
| `dia-06` (CRUD) | 100 % | 94,11 % | 100 % | 100 % |

> El provider `v8` usa la cobertura nativa de V8 (rápido, sin instrumentar). El paquete `@vitest/coverage-v8` tiene que ir en la misma versión que `vitest`. El reporte HTML queda en `frontend/coverage/`, que está en `.gitignore`.

## Documentación oficial

- [Vitest: coverage](https://vitest.dev/guide/coverage.html)
- [Vitest: mocking](https://vitest.dev/guide/mocking.html)
- [Vue Test Utils: asynchronous behavior](https://test-utils.vuejs.org/guide/advanced/async-suspense.html)
- [MDN: 204 No Content](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/204)
