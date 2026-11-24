# Bloque 10: guion de la demo técnica

Entregable del bloque 10, junto con el [README](../README.md). Es una demo de 10 minutos del proyecto integrador. Cada comando de este guion se corrió contra `main` (el 19/11, y de nuevo el 24/11 con #28 a #30 mergeados), y la salida que figura es la real.

**Antes de empezar:** dos terminales en la raíz del repo, el navegador abierto y `backend/Upskill.Api/upskill.db` borrado para arrancar con la base vacía.

## 1. El problema y la forma (1 min)

Abrí el README en la sección Arquitectura. La idea es una app de tareas chica, pero con lo que tiene un producto real: contrato tipado, errores estándar, tests en las dos puntas, CI/CD y un workflow con IA que se puede auditar.

## 2. La app andando (2 min)

```bash
dotnet run --project backend/Upskill.Api --launch-profile http          # terminal 1
cd frontend && VITE_TODOS_API=true npm run dev                          # terminal 2
```

En `http://localhost:5173`: agregá dos tareas, marcá una y recargá. El panel de stats (día 28) muestra los conteos de `/api/todos/stats`; tocá "Actualizar". Siguen ahí porque las guardó la API, no el estado del componente. Para mostrar que la UI no conoce la fuente de datos, señalá en `App.vue` el `Repository<T>`, que puede ser en memoria o HTTP.

## 3. La API por dentro (3 min)

```bash
curl -s localhost:5101/health
# Healthy

curl -s -X POST localhost:5101/api/todos -H 'Content-Type: application/json' -d '{"title":""}'
# {"type":"https://tools.ietf.org/html/rfc9110#section-15.5.1","title":"One or more validation errors occurred.",
#  "status":400,"errors":{"Title":["The Title field is required."]},...}

for i in 1 2 3 4 5 6; do curl -s -o /dev/null -w '%{http_code} ' localhost:5101/api/notes; done
# 200 200 200 200 200 429

curl -s localhost:5101/openapi/v1.json | head -c 80
# { "openapi": "3.1.1", "info": { "title": "Upskill.Api | v1", ...
```

Qué contar en cada paso:

- **Validación:** la hace `AddValidation()` con DataAnnotations antes del handler. El error sale como ProblemDetails, igual que todos los demás.
- **Rate limiting:** ventana fija de 5 requests cada 10 segundos en `/api/notes`.
- **`GET /api/todos/stats`:** devuelve los tres conteos en un solo `SELECT` con `COUNT` condicional. Mostrá el SQL en [dia-26.md](dia-26.md).

## 4. Tests y CI (2 min)

```bash
scripts/check.sh all
```

- **Backend:** 48 casos verdes en unos segundos, con SQLite en memoria para los unit y `WebApplicationFactory` para los de integración, y una base nueva por test.
- **Frontend:** 52 tests con Vitest. Abrí `dia-06/__tests__/dia-06.spec.ts`, el test "useCrud vuelve atrás un borrado si el server falla": es update optimista con rollback.
- **Smoke y E2E:** `scripts/smoke.sh` recorre el CRUD contra la API real, y `cd e2e && npx playwright test --ui` muestra el E2E paso a paso en el navegador. Es el mejor cierre visual de esta parte.
- **CI:** en un PR cualquiera, mostrá los checks de GitHub Actions y el resumen de cobertura del backend.
- **Azure:** abrí `azure-pipelines.yml` y recorré los stages Build → Smoke → DeployDev → DeployProd. Aclarales que está validado contra el schema, pero no se corre desde GitHub.

## 5. El workflow con IA (2 min)

Abrí el [bloque 9](bloque-9-workflow-ia.md): el caso `DELETE /api/todos/completed`, con sus commits rojo y verde, y el prompt file `/feature-tdd` que lo ejecuta. Contá el ciclo:

1. Los tests los aprobás vos antes de que haya código.
2. El agente implementa sin tocar los tests.
3. El hook `verify-on-stop` corre `scripts/check.sh` y bloquea el cierre del turno si algo falla. En [dia-26.md](dia-26.md) está la prueba con un bug metido a propósito.

Lo que conviene decir explícitamente: todo el código del repo se puede explicar línea por línea. La IA aceleró la escritura, pero las decisiones están en los docs de cada bloque.

## Preguntas probables

| Pregunta | Respuesta corta | Dónde está |
| --- | --- | --- |
| ¿Por qué Minimal APIs y no controllers? | Menos ceremonia para una API chica, con `TypedResults` y grupos por feature. | [dia-13.md](dia-13.md) |
| ¿Cómo evitás que el front y el back se desincronicen? | DTOs espejados y OpenAPI expuesto. El siguiente paso sería generar el cliente. | `Todo.cs`, `dia-06/types.ts` |
| ¿Microfrontends para esto? | No, sería sobreingeniería, y el memo explica cuándo sí. | [bloque-4](bloque-4-memo-microfrontends.md) |
| ¿Cuánto rindió la IA? | Sin medición propia todavía. El informe cita los estudios y deja el protocolo para medir. | [bloque-8](bloque-8-informe-copilot.md) |

## Docs oficiales

- [ASP.NET Core: Minimal APIs](https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis)
- [ASP.NET Core: manejo de errores y ProblemDetails](https://learn.microsoft.com/aspnet/core/fundamentals/error-handling-api)
- [ASP.NET Core: rate limiting](https://learn.microsoft.com/aspnet/core/performance/rate-limit)
- [ASP.NET Core: OpenAPI](https://learn.microsoft.com/aspnet/core/fundamentals/openapi/overview)
- [Vue: Composition API](https://vuejs.org/guide/extras/composition-api-faq)
- [Azure Pipelines: YAML schema](https://learn.microsoft.com/azure/devops/pipelines/yaml-schema/)
