# upskill-tgv

Proyecto integrador del plan de upskilling Full Stack de 30 días (07/10 al 19/11/2026): una app de tareas con frontend Vue 3 + TypeScript, una API ASP.NET Core 10 con EF Core, tests en las dos puntas, CI en GitHub Actions, un pipeline de Azure y un workflow de desarrollo con IA documentado. Cada día del plan entró como un PR con código y su ayuda memoria en [`docs/`](docs/README.md).

## Arquitectura

```text
Navegador ──► Vite (frontend/, :5173) ──/api──► ASP.NET Core (backend/Upskill.Api, :5101) ──► SQLite (EF Core)
              Vue 3 + TS, Repository<T>    proxy        Minimal APIs, ProblemDetails,
              memoria o HTTP                            validación, rate limiting, OpenAPI
```

- **Frontend** ([`frontend/`](frontend)): Vue 3 con Composition API y TypeScript estricto. El CRUD tipado (`dia-06/`) habla con un `Repository<T>` que puede ser en memoria o HTTP. `VITE_TODOS_API=true` elige la API real.
- **Backend** ([`backend/Upskill.Api`](backend/Upskill.Api)): Minimal APIs agrupadas por feature (`Todos/`, `Practica/`, `Demo/`). La lógica vive en `TodoService`, que se testea sin HTTP. Los errores salen como ProblemDetails (RFC 9457).
- **Microfrontends** ([`mfe/`](mfe/README.md)): host y remote con Module Federation, del bloque 4, separados de la app principal.
- **Decisiones**: [migración Vue 2→3](docs/bloque-1-decisiones.md), [memo de microfrontends](docs/bloque-4-memo-microfrontends.md).

## API

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | `/api/todos?done=&q=` | lista, con filtro por estado y búsqueda en el título |
| GET | `/api/todos/{id}` | uno, o 404 |
| GET | `/api/todos/stats` | `{ total, done, pending }` en una sola consulta |
| POST | `/api/todos` | alta. 201 con `Location`, o 400 con ProblemDetails |
| PATCH | `/api/todos/{id}` | edición parcial (`null` = no tocar) |
| DELETE | `/api/todos/{id}` | baja. 204, o 404 |
| GET | `/health`, `/openapi/v1.json` | health check y contrato OpenAPI (en Development) |

`/api/notes` (con rate limiting y 409 por duplicado) y `/api/demo` quedan como práctica del bloque 5.

## Correrlo

Requisitos: .NET SDK 10 y Node 22.

```bash
# terminal 1: API en http://localhost:5101 (crea y migra upskill.db)
dotnet run --project backend/Upskill.Api --launch-profile http

# terminal 2: frontend en http://localhost:5173, contra la API
cd frontend && npm ci && VITE_TODOS_API=true npm run dev
```

Sin `VITE_TODOS_API`, el frontend usa el repositorio en memoria y no necesita la API.

## Calidad

```bash
scripts/check.sh            # lo mismo que el CI, solo para las áreas que cambiaste
scripts/check.sh all        # frontend + backend + pipeline + hooks
```

| Capa | Dónde | Cuántos |
| --- | --- | --- |
| Frontend unit + componentes | `frontend/src/**/__tests__` (Vitest + Vue Test Utils) | 50 |
| Backend unit | `backend/Upskill.Api.Tests/Unit` (xUnit v3, SQLite en memoria, `FakeTimeProvider`) | 13 métodos |
| Backend integración | `backend/Upskill.Api.Tests/Integration` (`WebApplicationFactory`) | 20 métodos |

Backend: 45 casos en total, contando los `Theory`. Detalle en [la suite de tests del bloque 6](docs/bloque-6-suite-tests.md).

## CI/CD

- **GitHub Actions** (`.github/workflows/`): frontend (type-check, tests, build), backend (build con `-warnaserror`, tests con cobertura en el resumen), validación del pipeline de Azure, hooks y microfrontends.
- **Azure Pipelines** ([`azure-pipelines.yml`](azure-pipelines.yml)): Build → Smoke del artefacto publicado → DeployDev → DeployProd, con un template de deploy reutilizable. Está validado contra el schema, pero no corre desde GitHub porque necesita una organización de Azure DevOps y service connections. Ver [bloque 7](docs/bloque-7-pipeline.md).

## Desarrollo con IA

- Instrucciones del repo para Copilot: `.github/copilot-instructions.md`, más `instructions/` por área con `applyTo`.
- Agente `Reviewer` de solo lectura, prompt files (`/tests-endpoint`) y la skill `verificar-cambios`.
- Hooks (`.github/hooks/`): `guard.cjs` bloquea comandos destructivos y `verify-on-stop.cjs` corre los checks antes de que el agente cierre el turno.
- Informe con y sin IA: [bloque 8](docs/bloque-8-informe-copilot.md). Workflow documentado: [días 25](docs/dia-25.md) y [26](docs/dia-26.md).

## Demo técnica

Guion de 10 minutos con los comandos verificados: [docs/bloque-10-demo.md](docs/bloque-10-demo.md).
