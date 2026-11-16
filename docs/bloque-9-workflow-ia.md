# Bloque 9: workflow asistido por IA

Entregable del bloque: el workflow que uso para una feature con agente, y un caso completo hecho con él (`DELETE /api/todos/completed`). Los días [25](dia-25.md) y [26](dia-26.md) armaron las piezas. Acá quedan juntas.

## El workflow en una tabla

| # | Paso | Pieza del repo | Quién decide | Señal de salida |
| --- | --- | --- | --- | --- |
| 1 | Pedido escrito | issue o una línea en el chat | vos | entrada, salida y caso borde |
| 2 | Plan | modo Plan o paso 1 de `feature-tdd.prompt.md` | vos aprobás | lista de tests, sin código |
| 3 | Rojo | `feature-tdd.prompt.md` paso 2 | agente escribe, vos commiteás | falla por lo que falta |
| 4 | Verde | paso 3 + `copilot-instructions.md` | agente | verde sin tocar tests |
| 5 | Refactor | paso 4 | agente o vos | mismos tests + evidencia (SQL) |
| 6 | Revisión | agente `Reviewer` (solo lectura) | vos | nada accionable o fixes con test |
| 7 | Verificación | `scripts/check.sh` y hook `verify-on-stop` (día 25) | hook | `block` si algo falla |
| 8 | PR | Antes/Después + qué mirar | vos | CI verde |

Tres reglas sostienen todo:

- **Los tests los aprobás vos antes del código.** Son el único punto donde el agente no puede "ajustar" la meta.
- **Un commit por fase.** Si el refactor sale mal, `git reset --hard HEAD~1` vuelve a verde. El hook `guard.cjs` del día 25 se lo bloquea al agente, pero vos podés.
- **Cada afirmación lleva evidencia**: salida del build, conteo de tests, SQL. "Debería andar" no cuenta.

## El prompt file que lo ejecuta

[`.github/prompts/feature-tdd.prompt.md`](../.github/prompts/feature-tdd.prompt.md) se corre con `/feature-tdd` en el chat. Tiene paradas explícitas después del plan, del rojo y del verde, así cada commit es tuyo.

## Caso completo: `DELETE /api/todos/completed`

**1. Pedido.** "Borrar de una todas las hechas y saber cuántas se borraron. Sin hechas, devuelve 0, no 404."

**2. Plan aprobado.** Unit: borra solo las hechas y devuelve el conteo; sin hechas devuelve 0. Integración: 200 con `{ deleted }` y las pendientes siguen en el GET.

**3. Rojo** (commit `Bloque 9 (rojo)`):

```csharp
[Fact]
public async Task DeleteDone_borra_solo_las_hechas_y_devuelve_cuantas()
{
    // 3 todos: 2 hechas, 1 pendiente
    Assert.Equal(2, await Service().DeleteDoneAsync(_ct));
    Assert.Equal([pending], await Service().ListAsync(done: null, _ct));
}
```

```text
error CS0246: The type or namespace name 'DeleteDoneResult' could not be found
error CS1061: 'TodoService' does not contain a definition for 'DeleteDoneAsync'
```

**4. Verde** (commit `Bloque 9 (verde)`):

```csharp
public Task<int> DeleteDoneAsync(CancellationToken ct) =>
    db.Todos.Where(t => t.Done).ExecuteDeleteAsync(ct);

todos.MapDelete("/completed", async (TodoService svc, CancellationToken ct) =>
    TypedResults.Ok(new DeleteDoneResult(await svc.DeleteDoneAsync(ct))));
```

```text
total: 39   failed: 0   succeeded: 39
```

**5. Refactor.** No hizo falta. `ExecuteDeleteAsync` ya es una sola sentencia y no carga entidades. `ExecuteDelete` no tiene `ToQueryString`, así que el SQL sale del log de EF (`LogTo`) en un test temporal que después se borró:

```sql
DELETE FROM "Todos" AS "t"
WHERE "t"."Done"
```

Saltear el refactor también es una decisión válida, siempre que esté respaldada por la evidencia.

**6. Revisión** con el agente `Reviewer`, contra su checklist:

- Comportamiento: `/completed` no choca con `/{id:int}`, porque la constraint descarta texto. Sin hechas devuelve `{ deleted: 0 }`, como pedía el pedido.
- Tests: hay caso feliz, caso vacío y comprobación de que las pendientes siguen.
- Errores: no hay camino que devuelva algo distinto de ProblemDetails.
- Lo que no se verificó: `ExecuteDelete` saltea el change tracker. Hoy no importa (un contexto por request), pero conviene saberlo si algún día se agregan interceptores de `SaveChanges`.

**7. Verificación.** `dotnet build -warnaserror` sin warnings, 39 tests de backend (48 después de mergear main con los días 23 a 26) y vitest del frontend en verde. Esto mismo lo corre el hook `verify-on-stop` al cerrar el turno del agente.

**8. PR.** Este mismo, con los commits rojo y verde visibles en el historial.

## Cuándo no usar este workflow

- Cambios de una línea o de docs: el costo de las paradas supera lo que aporta.
- Exploración ("¿cómo haría X?"): primero modo Ask o Plan, sin edición.
- Cambios de esquema o de contrato con el frontend: el plan lo revisa también quien consume la API.

## Docs oficiales

- [Prompt files](https://code.visualstudio.com/docs/agent-customization/prompt-files)
- [Custom agents](https://code.visualstudio.com/docs/agent-customization/custom-agents)
- [Hooks](https://code.visualstudio.com/docs/agent-customization/hooks)
- [TDD con agentes](https://code.visualstudio.com/docs/agents/guides/test-driven-development-guide)
- [Buenas prácticas con agentes](https://code.visualstudio.com/docs/agents/best-practices)
- [EF Core: ExecuteUpdate y ExecuteDelete](https://learn.microsoft.com/ef/core/saving/execute-insert-update-delete)
- [EF Core: logging simple (`LogTo`)](https://learn.microsoft.com/ef/core/logging-events-diagnostics/simple-logging)
