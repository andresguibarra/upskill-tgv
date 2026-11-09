# Día 23: GitHub Copilot en la práctica

Una tarea real de punta a punta con el flujo **Plan → Agent → tests → review**, usando los archivos de Copilot del [día 22](dia-22.md). La tarea: buscar todos por título con `GET /api/todos?q=`. Conviene mirar primero [`TodoService.ListAsync`](../backend/Upskill.Api/Todos/TodoService.cs) y los tests nuevos (`List_busca_en_el_titulo` y `Get_combina_q_con_done`).

El código de este PR lo escribí yo, Claude Code, siguiendo este mismo flujo. Los prompts de abajo son los que usarías en Copilot para hacerlo vos y comparar mañana.

## 1. Plan antes de tocar nada

```text
[Plan] Quiero buscar todos por título con GET /api/todos?q=texto, combinable con ?done=.
Sin distinguir mayúsculas. Decime qué archivos cambiarías, qué tests sumarías
y qué casos borde ves con SQLite.
```

Lo que tiene que aparecer en el plan: `TodoService.ListAsync`, el endpoint, un `Theory` de unit tests y un test de integración. Los casos borde son mayúsculas, espacios, `%` y `_` como literales y acentos. Si no los menciona, pedíselos antes de implementar.

## 2. Implementar con restricciones y verificación

```text
[Agent] Implementá el plan. No cambies el contrato de las otras rutas ni el DTO.
La búsqueda va en TodoService, no en el endpoint.
Corré dotnet test desde backend/ y mostrame el resultado.
```

```csharp
// lo que quedó en TodoService
if (!string.IsNullOrWhiteSpace(q))
{
    var term = q.Trim().ToLowerInvariant();
    query = query.Where(t => t.Title.ToLower().Contains(term));   // se traduce sin LIKE: % y _ quedan literales
}
```

Un pedido a un agente cierra mejor con tres partes: qué hacer, qué no tocar y cómo probarlo. Las restricciones evitan los "ya que estaba" (renombres, formato, un DTO nuevo).

## 3. Tests con el prompt file

```text
/tests-endpoint GET /api/todos?q=
```

```csharp
[Theory]
[InlineData("pipeline", 2)]          // no distingue mayúsculas
[InlineData("  azure  ", 1)]         // recorta espacios
[InlineData("100%", 1)]              // % es literal, no comodín
[InlineData("", 4)]                  // vacío = sin filtro
public async Task List_busca_en_el_titulo(string q, int expected)
```

El prompt file ya trae el estilo (`ApiFactory`, un cliente por test, ProblemDetails) y el comando para verificar, así que el pedido es una línea. Revisá que los casos los elegiste vos: la IA tiende a testear el camino feliz.

## 4. Cuando un test falla

```text
#execute/testFailure ¿Por qué falla? Arreglá la implementación, no el test.
```

"No el test" importa: si no, el agente ajusta el `expected` al valor que da y el test pasa sin probar nada.

## 5. Review antes del commit

```text
[Reviewer] #search/changes
```

El agente `Reviewer` del día 22 lee el diff sin poder editarlo. En esta tarea tendría que marcar lo que sigue:

| Trampa | Por qué |
| --- | --- |
| `EF.Functions.Like(t.Title, $"%{q}%")` | `%` y `_` en la búsqueda pasan a ser comodines: `100%` matchea "1000" |
| `lower()` en SQLite | solo baja ASCII: "INTEGRACIÓN" no encuentra "integración" (lo dejé documentado en el código) |
| Cambiar la firma de `ListAsync` | rompe los otros llamadores: el agente tiene que buscarlos (`#search/usages`) |

## 6. Delegar a la nube

```markdown
<!-- issue asignado a Copilot -->
Agregar ?q= a GET /api/todos (búsqueda por título, sin distinguir mayúsculas, combinable con ?done=).
- La lógica va en TodoService.ListAsync.
- Tests: Theory en Unit/TodoServiceTests y uno de integración en TodosApiTests.
- Listo cuando `dotnet test` pasa en CI.
```

Para el agente de la nube, el issue es el prompt. Los criterios de "listo" verificables (tests, CI) valen más que la descripción.

## Para mañana: cómo medir con y sin IA

El entregable del bloque es un informe comparativo. Hacé dos tareas del mismo tamaño, una sin Copilot y otra con Copilot, y anotá:

| Tarea | Con IA | Tiempo | Iteraciones | Bugs que encontró el review | Tests escritos por vos |
| --- | --- | --- | --- | --- | --- |
| `GET /api/todos?sort=title` (y `-title`; 400 si el valor no es válido) | no | | | | |
| `PATCH /api/notes/{id}` para renombrar, con validación y 404 | sí | | | | |

Con una tarea medida de cada lado alcanza para un informe honesto. Si no llegás, mañana lo armo con esta tarea como caso "con IA" y una estimación sin IA, aclarando que es estimada.

## Docs oficiales

- [Best practices para agentes en VS Code](https://code.visualstudio.com/docs/agents/best-practices)
- [Planning](https://code.visualstudio.com/docs/agents/run/planning)
- [Probar código con IA](https://code.visualstudio.com/docs/agents/guides/test-code-with-ai)
- [Prompt files](https://code.visualstudio.com/docs/agent-customization/prompt-files)
- [Tools y contexto (`#`)](https://code.visualstudio.com/docs/agents/reference/tools-reference)
- [Copilot en GitHub](https://docs.github.com/copilot/concepts/copilot-surfaces/copilot-on-github)
- [EF Core: funciones de string en SQLite](https://learn.microsoft.com/ef/core/providers/sqlite/functions)
