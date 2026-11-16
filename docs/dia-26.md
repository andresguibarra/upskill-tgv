# Día 26: workflow con IA en la práctica (TDD)

El ciclo del [día 25](dia-25.md) aplicado a una tarea chica: `GET /api/todos/stats` devuelve `{ total, done, pending }`. Se hizo en tres commits, **rojo → verde → refactor**, y se pueden ver en el historial de la rama. Conviene mirar primero los tests (`Stats_*` en `Unit/TodoServiceTests.cs` y `Get_stats_refleja_los_cambios`), porque son la especificación.

## 1. Rojo: el test es el pedido

```csharp
[Fact]
public async Task Stats_cuenta_total_hechas_y_pendientes()
{
    // 3 todos, 1 hecho
    Assert.Equal(new TodoStats(Total: 3, Done: 1, Pending: 2), await Service().StatsAsync(_ct));
}

[Fact]
public async Task Stats_sin_todos_devuelve_ceros() =>
    Assert.Equal(new TodoStats(0, 0, 0), await Service().StatsAsync(_ct));
```

```text
error CS0246: The type or namespace name 'TodoStats' could not be found
error CS1061: 'TodoService' does not contain a definition for 'StatsAsync'
```

Los tests se escriben antes y se commitean solos. El caso "sin todos" está a propósito: es el que rompe el refactor de abajo si se hace mal. Con un agente, este commit es tu parte; el agente recibe "hacé pasar estos tests sin tocarlos".

## 2. Verde: lo mínimo

```csharp
public async Task<TodoStats> StatsAsync(CancellationToken ct)
{
    var total = await db.Todos.CountAsync(ct);
    var done = await db.Todos.CountAsync(t => t.Done, ct);
    return new TodoStats(total, done, total - done);
}

todos.MapGet("/stats", ...);   // no choca con /{id:int}: la constraint int descarta "stats"
```

```text
total: 39   failed: 0   succeeded: 39
```

Verde primero, aunque haga dos consultas. Es el punto de control: con esto commiteado, el refactor se puede tirar si sale mal.

## 3. Refactor: una sola consulta, mismos tests

```csharp
public async Task<TodoStats> StatsAsync(CancellationToken ct) =>
    await db.Todos
        .GroupBy(_ => 1)
        .Select(g => new TodoStats(g.Count(), g.Count(t => t.Done), g.Count(t => !t.Done)))
        .FirstOrDefaultAsync(ct)
    ?? new TodoStats(0, 0, 0);          // sin filas no hay grupo: sin esto, el test de ceros falla
```

```sql
-- lo que genera EF Core (sacado con ToQueryString)
SELECT COUNT(*), COUNT(CASE WHEN "t0"."Done" THEN 1 END), COUNT(CASE WHEN NOT ("t0"."Done") THEN 1 END)
FROM (SELECT "t"."Done", 1 AS "Key" FROM "Todos" AS "t") AS "t0"
GROUP BY "t0"."Key"
```

Lo de "una sola consulta" no queda supuesto: `ToQueryString()` muestra el SQL real. Cuando un agente propone una optimización de EF, ese es el chequeo.

## 4. El hook verify-on-stop con un bug real

Para probarlo, en un worktree aparte se metió un bug a propósito (`Pending` contaba los hechos) y se corrió el hook como lo llama Copilot:

```bash
git worktree add --detach ../wt-hook HEAD
# bug: g.Count(t => !t.Done) → g.Count(t => t.Done)
echo '{"stop_hook_active":false}' | node .github/hooks/verify-on-stop.cjs
# {"decision":"block","reason":"Los checks del repo fallaron... total: 39, failed: 2, succeeded: 37"}
echo '{"stop_hook_active":true}' | node .github/hooks/verify-on-stop.cjs
# {}        ← segunda vez en el mismo turno: no insiste
git worktree remove --force ../wt-hook
```

El hook bloqueó con el resumen de la corrida (2 tests fallados) como `reason`, que es lo que el agente lee para seguir corrigiendo. Con `stop_hook_active: true` devuelve `{}`, así no entra en loop. `scripts/check.sh` y los hooks vienen del PR del día 25.

## Lo que se repite en cualquier tarea

| Paso | Quién | Señal de que está bien |
| --- | --- | --- |
| Tests en rojo, commit | vos (o el agente, revisado por vos) | fallan por la razón esperada |
| Implementación mínima, commit | agente | verde sin tocar los tests |
| Refactor, commit | agente o vos | mismos tests verdes, más una prueba del "por qué" (el SQL) |
| Verificación antes de cerrar | hook | `block` si algo falla |

## Docs oficiales

- [TDD con agentes en VS Code](https://code.visualstudio.com/docs/agents/guides/test-driven-development-guide)
- [Hooks](https://code.visualstudio.com/docs/agent-customization/hooks)
- [EF Core: ver el SQL generado (`ToQueryString`)](https://learn.microsoft.com/ef/core/logging-events-diagnostics/simple-logging#tostring-and-toquerystring)
- [EF Core: operadores de agregación y GroupBy](https://learn.microsoft.com/ef/core/querying/complex-query-operators#groupby)
- [Route constraints en ASP.NET Core](https://learn.microsoft.com/aspnet/core/fundamentals/routing#route-constraints)
- [git worktree](https://git-scm.com/docs/git-worktree)
