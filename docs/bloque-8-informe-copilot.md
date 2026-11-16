# Informe: desarrollo con y sin IA (entregable del bloque 8)

**En una línea:** la IA acelera mucho la parte que ya sabés verificar (estructura, tests, configuración conocida) y apenas ayuda, o hasta frena, donde el problema es entender un sistema grande o una herramienta que cambió hace poco. En este repo, todo lo que salió mal pasó la etapa de "parece correcto" y lo agarró una verificación automática: un test, un validador o un smoke test. Ninguna de esas fallas apareció leyendo el código.

## Alcance y honestidad del informe

- Las 24 entregas de este repo (24 PRs, 07/10 a 11/11) se hicieron con un agente de IA, Claude Code, con Andres revisando y mergeando. Copilot en modo agente sigue el mismo flujo (ver [día 23](dia-23.md)), así que las conclusiones aplican, pero **no son mediciones de Copilot**.
- **No hay mediciones propias con cronómetro** de la misma tarea con y sin IA. Lo cuantitativo sale de dos estudios controlados publicados. Lo cualitativo y los ejemplos son incidentes reales del repo, con el commit o el día donde quedaron.
- Al final está el protocolo para completar la medición propia con dos tareas cortas.

## Qué dicen los estudios controlados

| Estudio | Quiénes y qué tarea | Resultado |
| --- | --- | --- |
| [Peng et al., 2023](https://arxiv.org/abs/2302.06590) (GitHub + Microsoft) | 95 devs, escribir un servidor HTTP en JavaScript desde cero | con Copilot terminaron **55,8% más rápido** |
| [METR, 2025](https://arxiv.org/abs/2507.09089) | 16 devs experimentados, 246 tareas reales en repos open source grandes que ya conocían | con IA tardaron **19% más**, aunque creían haber ido 20% más rápido |

No se contradicen: miden cosas distintas. En una tarea nueva, acotada y con un objetivo claro, la IA ahorra el tipeo y la búsqueda de APIs. En un código grande que el dev ya domina, el tiempo se va en explicar el contexto, esperar y revisar sugerencias que no encajan. Lo más útil del segundo estudio: **la sensación de ir más rápido no es una medición**.

## Dónde ayudó y dónde no, en este repo

| Tipo de trabajo | Con IA | Sin IA (estimación cualitativa) | Ejemplo en el repo |
| --- | --- | --- | --- |
| Estructura repetitiva (endpoints CRUD, DTOs, tests con el mismo patrón) | rápido y consistente | lento, pero sin sorpresas | `/api/todos` y sus tests ([día 15](dia-15.md), [día 17](dia-17.md)) |
| Tests de casos borde | buenos si los casos los elegís vos | igual de buenos, más lentos | `List_busca_en_el_titulo` ([día 23](dia-23.md)) |
| Configuración de herramientas nuevas (.NET 10, xUnit v3, Azure Pipelines) | **el punto débil**: propone la versión de hace un año | lento, pero leyendo la doc actual | ejemplos 1 a 4 de abajo |
| Documentación y cheat sheets | rápido; hay que verificar nombres y links | lento | `docs/` entero, ~1.900 líneas |
| Encontrar la causa de un bug | ayuda si le das el error y el test que falla | depende del conocimiento del sistema | ejemplo 5 |

## Ejemplos reales: lo que la IA escribió y lo que lo detectó

1. **xUnit v3 con el runner viejo** ([día 16](dia-16.md)). El primer proyecto de tests usaba VSTest, como en .NET 8, y .NET 10 lo rechaza con xUnit v3. **Lo detectó** `dotnet test`. **Fix:** `global.json` con Microsoft.Testing.Platform.
2. **Cobertura mal configurada** ([día 18](bloque-6-suite-tests.md)). `--coverage-settings` con ruta relativa fallaba, y el reporte incluía el código generado en `obj/`. **Lo detectó** la propia corrida de cobertura. **Fix:** ruta absoluta y excluir `obj/` y las migraciones.
3. **La API publicada respondía 503** ([día 20](dia-20.md)). Las migraciones solo corrían en Development, así que en Production la base no existía. El código "se veía bien" y los tests pasaban, porque usan su propia base. **Lo detectó** el smoke test del pipeline. **Fix:** `Database:MigrateOnStartup`.
4. **Un valor que todavía no existe en el schema** ([día 21](bloque-7-pipeline.md)). `runtimeStack: DOTNETCORE|10.0` en `AzureWebApp@1`. **Lo detectó** el validador contra el schema oficial. **Fix:** fijar el stack al crear la App Service.
5. **Un test que rompía el rate limiter** ([día 18](bloque-6-suite-tests.md)). Un test de notas hacía 6 requests y el límite es 5 cada 10 s, así que fallaba con 429. **Lo detectó** la suite. **Fix:** ajustar el test y sumar uno dedicado al 429.
6. **Doc de Copilot vieja** ([día 22](dia-22.md)). El primer borrador usaba nombres de tools (`runCommands`) y URLs de la doc de VS Code de 2025, y la doc se reorganizó en 2026. **Lo detectó** contrastar contra el repo fuente de la doc. **Fix:** nombres actuales (`execute/runInTerminal`) y links nuevos.
7. **Una convención inventada** ([día 22](dia-22.md)). Las instrucciones para Copilot decían que los tests se nombran `Metodo_Escenario_Resultado`, pero en el repo son `Patch_de_un_id_inexistente_devuelve_null`. **Lo detectó** un grep sobre los tests reales. **Fix:** describir la convención que existe.
8. **`LIKE` con comodines** ([día 23](dia-23.md)). La versión obvia, `EF.Functions.Like(t.Title, $"%{q}%")`, hace que buscar `100%` devuelva también "1000". **Lo detectó** un caso borde elegido a propósito en el `Theory`. **Fix:** `Contains`, que no usa `LIKE`.

El patrón: la IA es más peligrosa cuando acierta casi todo. Los ocho errores eran **plausibles**, y por eso pasaban una lectura rápida.

## Reglas que salen de esto

- **Pedí la verificación junto con el cambio:** "corré `dotnet test` y mostrame el resultado". Está en [`.github/copilot-instructions.md`](../.github/copilot-instructions.md) para que no dependa de acordarse.
- **Los casos borde los elegís vos.** La IA completa el resto del test.
- **Con herramientas nuevas, la doc manda.** Si la versión salió hace menos de un año, contrastá cada flag y cada nombre de task.
- **Smoke tests y validadores valen más con IA que sin ella**, porque el volumen de código que hay que revisar sube.
- **Medí, no estimes.** La sensación de velocidad engaña (METR).

## Volumen producido

| | |
| --- | --- |
| PRs | 24 en 25 días hábiles |
| Código (`.cs`, `.ts`, `.vue`, sin migraciones) | ~2.300 líneas, ~1.100 de tests |
| Tests | 86 en main (36 de backend, 50 de frontend), 92 con el PR del día 23 |
| Docs | ~1.900 líneas en `docs/` |

Es mucho volumen para cinco semanas, y no se puede atribuir todo a la IA: Andres ya conocía los temas y el plan era de repaso.

## Medición propia pendiente (protocolo)

Dos tareas del mismo tamaño, una con cada modalidad. Se toma el tiempo desde que se empieza hasta que hay un PR con CI verde.

| Tarea | Con IA | Tiempo | Iteraciones con el agente | Bugs que encontró la revisión | Casos borde elegidos por vos |
| --- | --- | --- | --- | --- | --- |
| `GET /api/todos?sort=title` y `-title` (400 si el valor no es válido) | no | | | | |
| `PATCH /api/notes/{id}` para renombrar, con validación y 404 | sí | | | | |

Con esas dos filas, este informe pasa de "evidencia externa + casos" a "evidencia externa + casos + medición propia".

## Fuentes

- Peng, Kalliamvakou, Cihon, Demirer. [The Impact of AI on Developer Productivity: Evidence from GitHub Copilot](https://arxiv.org/abs/2302.06590), 2023.
- METR. [Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity](https://arxiv.org/abs/2507.09089), 2025.
- [Copilot en GitHub](https://docs.github.com/copilot/concepts/copilot-surfaces/copilot-on-github) y [best practices para agentes en VS Code](https://code.visualstudio.com/docs/agents/best-practices).
