# Día 15: API REST CRUD de todos (entregable del bloque 5)

Es el entregable del bloque 5: `/api/todos` con EF Core y SQLite, validación, ProblemDetails y OpenAPI. Respeta el contrato `Repository<Todo>` del frontend ([`dia-06/types.ts`](../frontend/src/dia-06/types.ts)), así que el CRUD del día 6 funciona contra la API sin cambios. Conviene mirar primero [`Todos/TodosEndpoints.cs`](../backend/Upskill.Api/Todos/TodosEndpoints.cs) y después [`Todos/TodoService.cs`](../backend/Upskill.Api/Todos/TodoService.cs).

```bash
cd backend && dotnet run --project Upskill.Api                # :5101, aplica las migraciones en dev
cd frontend && VITE_TODOS_API=true npm run dev                # :5173, /api va por el proxy de Vite
```

## Contrato

| Método y ruta | Body | Respuesta | `Repository<Todo>` |
| --- | --- | --- | --- |
| `GET /api/todos?done=` | | 200 `TodoDto[]` | `list()` |
| `GET /api/todos/{id}` | | 200 o 404 | |
| `POST /api/todos` | `{ title, done? }` | 201 + `Location`, o 400 | `create(draft)` |
| `PATCH /api/todos/{id}` | `{ title?, done? }` | 200, 400 o 404 | `update(id, patch)` |
| `DELETE /api/todos/{id}` | | 204 o 404 | `remove(id)` |

Los errores siempre son `application/problem+json`, y los 400 traen `errors: { Title: [...] }`. `http()` del día 5 ya acepta el 204 del DELETE.

## Capas

```csharp
// Endpoint: HTTP (binding, status codes). Nada de lógica.
todos.MapPatch("/{id:int}", async Task<Results<Ok<TodoDto>, NotFound>> (int id, PatchTodo body, TodoService svc, CancellationToken ct) =>
    await svc.PatchAsync(id, body, ct) is { } todo ? TypedResults.Ok(todo) : TypedResults.NotFound());

// Servicio: reglas y EF Core. Devuelve null/false en lugar de conocer HTTP.
public async Task<TodoDto?> PatchAsync(int id, PatchTodo patch, CancellationToken ct)
{
    var todo = await db.Todos.FindAsync([id], ct);
    if (todo is null) return null;
    if (patch.Title is not null) todo.Title = patch.Title.Trim();
    if (patch.Done is not null) todo.Done = patch.Done.Value;
    todo.UpdatedAt = time.GetUtcNow();
    await db.SaveChangesAsync(ct);
    return ToDto(todo);
}
```

La entidad (`Todo`, con `CreatedAt`/`UpdatedAt`) nunca sale por la API: sale `TodoDto`, así el contrato no cambia si cambia la tabla. El servicio recibe `TimeProvider` y `AppDbContext` por DI, que es lo que se reemplaza en los tests del bloque 6.

## Validación con `AddValidation()` (.NET 10)

```csharp
public sealed record CreateTodo([property: Required, StringLength(100, MinimumLength = 1)] string Title, bool Done = false);
public sealed record PatchTodo([property: StringLength(100, MinimumLength = 1), RegularExpression(@".*\S.*")] string? Title, bool? Done);

builder.Services.AddValidation();   // valida los parámetros con DataAnnotations → 400 ValidationProblem
```

Es nuevo en .NET 10 y reemplaza al endpoint filter que se escribió a mano el día 13: un source generator encuentra los tipos de los parámetros y valida antes del handler. Para saltearlo en un endpoint se usa `.DisableValidation()`. En el PATCH, `null` significa "no tocar", así que `Title` no es `Required`, pero si viene no puede ser vacío ni solo espacios.

## Frontend

```ts
// vite.config.ts: en dev, /api va al backend (mismo origen, sin CORS)
server: { proxy: { '/api': 'http://localhost:5101' } },

// App.vue
const todoRepo = import.meta.env.VITE_TODOS_API === 'true'
  ? createHttpRepository<Todo>('/api/todos')
  : createMemoryRepository<Todo>([...])
```

Verificado con Playwright: alta, tilde y baja desde la UI, y después de recargar la página los datos siguen en SQLite.

## Docs oficiales

- [Tutorial: Minimal API con EF Core](https://learn.microsoft.com/aspnet/core/tutorials/min-web-api)
- [Validación en Minimal APIs (.NET 10)](https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis#validation-support-in-minimal-apis)
- [Tracking y SaveChanges](https://learn.microsoft.com/ef/core/saving/basic)
- [Proxy del dev server de Vite](https://vite.dev/config/server-options.html#server-proxy) y [variables de entorno](https://vite.dev/guide/env-and-mode.html)
