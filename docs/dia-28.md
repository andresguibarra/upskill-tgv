# Día 28: proyecto integrador (repaso de la integración front ↔ back)

Arranca el bloque 10. El proyecto integrador es este mismo repo: Vue 3 + TS en `frontend/`, la API en `backend/`, con CI, pipeline e instrucciones de IA. Hoy se repasa lo que une las dos puntas, se suma el primer componente que consume un endpoint nuevo (`/stats`, del día 26) y un smoke test contra la API real.

## 1. El contrato: record de C# ↔ interface de TS

```csharp
public sealed record TodoStats(int Total, int Done, int Pending);   // backend/Upskill.Api/Todos/Todo.cs
```

```ts
export interface TodoStats { total: number; done: number; pending: number }   // frontend/src/dia-28/stats.ts
export const fetchStats = (signal?: AbortSignal) => http<TodoStats>('/api/todos/stats', { signal })
```

Minimal APIs serializan con los defaults web de System.Text.Json (camelCase), por eso `Total` llega como `total`. El tipo de TS es una promesa, no una validación: si el backend cambia, el compilador no se entera. Lo cubre el smoke de abajo, o un cliente generado desde OpenAPI (`AddOpenApi()` ya está en `Program.cs`).

## 2. Dev: proxy de Vite o CORS

```ts
// frontend/vite.config.ts: /api va al backend; el navegador ve un solo origen
server: { proxy: { '/api': 'http://localhost:5101' } }
```

```csharp
// Program.cs: hace falta solo si el front llama directo a :5101
p.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()
```

Con el proxy, las URLs del front son relativas (`/api/todos`) y valen igual en producción detrás del mismo host. CORS queda para cuando front y API viven en orígenes distintos.

## 3. Memoria o API con una variable

```ts
const useApi = import.meta.env.VITE_TODOS_API === 'true'   // tipada en env.d.ts
const todoRepo = useApi ? createHttpRepository<Todo>('/api/todos') : createMemoryRepository<Todo>(seed)
```

```bash
cd frontend && VITE_TODOS_API=true npm run dev     # con la API levantada en :5101
```

Solo las variables `VITE_*` llegan al bundle, y se reemplazan en build, no en runtime. El panel de stats solo se muestra con la API, porque en memoria no hay `/stats`.

## 4. El componente y su test

```vue
<p v-if="error" role="alert">Sin stats: {{ error }}</p>
<p v-else-if="stats">Hechas: {{ stats.done }} de {{ stats.total }}. Pendientes: {{ stats.pending }}.</p>
```

```ts
vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json({}, { status: 503 })))
const wrapper = mount(TodoStatsBar)
await flushPromises()
expect(wrapper.get('[role=alert]').text()).toContain('503')
```

Si falla, muestra el error en vez de ceros: unos ceros falsos se ven igual que una base vacía. Verificado también en el navegador, con la API y Vite levantados: con una tarea hecha y una pendiente, mostró "Hechas: 1 de 2".

## 5. Smoke test contra la API real

```bash
scripts/smoke.sh                       # levanta la API, recorre el CRUD y la apaga
scripts/smoke.sh https://mi-app-dev.azurewebsites.net   # contra un deploy, sin levantar nada
```

```text
ok  POST crea
ok  PATCH marca hecha
ok  GET filtra por done
ok  GET /stats cuenta
ok  DELETE borra
ok  GET después da 404
```

Los tests de integración usan `WebApplicationFactory` en memoria. El smoke prueba el proceso real: puerto, `launchSettings`, base SQLite en disco y serialización. Sirve también como paso post-deploy en el pipeline del bloque 7, que hoy solo pega a `/health`.

## Lo que queda del bloque

- **Día 29:** practicar el flujo completo desde la UI (completar y borrar las hechas, con `/completed` del #28) y sumar el smoke al CI.
- **Día 30:** el entregable: README del proyecto con arquitectura, cómo correrlo y un guion de demo técnica.

## Docs oficiales

- [Vite: `server.proxy`](https://vite.dev/config/server-options#server-proxy)
- [Vite: variables de entorno](https://vite.dev/guide/env-and-mode)
- [ASP.NET Core: CORS](https://learn.microsoft.com/aspnet/core/security/cors)
- [System.Text.Json: defaults web](https://learn.microsoft.com/dotnet/standard/serialization/system-text-json/configure-options#web-defaults-for-jsonserializeroptions)
- [ASP.NET Core: health checks](https://learn.microsoft.com/aspnet/core/host-and-deploy/health-checks)
- [Vue Test Utils: requests HTTP](https://test-utils.vuejs.org/guide/advanced/http-requests)
