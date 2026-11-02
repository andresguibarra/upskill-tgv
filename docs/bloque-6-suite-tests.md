# Suite de tests del backend (entregable del bloque 6)

El plan pedía al menos 10 unit tests y 5 de integración. La suite tiene **36: 16 unit y 20 de integración**, con **93,3% de cobertura de líneas** y 78,4% de ramas sobre `backend/Upskill.Api`, sin contar el código generado. Corre en cada PR que toca `backend/`. Los días [16](dia-16.md) y [17](dia-17.md) tienen la ayuda memoria de las herramientas.

```bash
cd backend
dotnet test                                                        # los 36
dotnet test --filter-namespace "*Unit"                             # 16
dotnet test --filter-namespace "*Integration"                      # 20
dotnet test --coverage --coverage-output-format cobertura \
  --coverage-settings "$PWD/Upskill.Api.Tests/coverage.config"     # → TestResults/coverage.cobertura.xml
```

## Qué cubre cada nivel

| Archivo | Nivel | Qué prueba |
| --- | --- | --- |
| `Unit/TodoServiceTests.cs` | unit (7) | alta con título recortado y fechas, filtro por `done`, PATCH parcial y `UpdatedAt`, id inexistente, borrado idempotente |
| `Unit/TodoValidationTests.cs` | unit (6) | DataAnnotations de `CreateTodo` y `PatchTodo` (vacío, largo, solo espacios, `null`) |
| `Unit/GreeterTests.cs` | unit (1) | options + `FakeTimeProvider` sin librería de mocks |
| `Unit/ItemStoreTests.cs` | unit (2) | ids correlativos y thread safety con 1000 altas en paralelo |
| `Integration/TodosApiTests.cs` | integración (5) | contrato HTTP de `/api/todos`: 201 + Location, 400, `?done=`, PATCH/404, DELETE 204/404 |
| `Integration/NotesApiTests.cs` | integración (4) | fijadas primero, paginado, búsqueda, pin, DELETE y **429 del rate limiter** |
| `Integration/ErrorsAndCorsTests.cs` | integración (7) | 500 sin filtrar el mensaje, 404 de rutas y de constraints como ProblemDetails, endpoint filter, **CORS permitido y rechazado**, OpenAPI oculto fuera de dev |
| `Integration/PipelineTests.cs` | integración (4) | `/health`, 409 del `IExceptionHandler`, header del middleware, mock de NSubstitute |

## Decisiones

- **SQLite en memoria, no el provider InMemory.** Las consultas se traducen a SQL de verdad: constraints, `ExecuteDelete` y `Contains` sensible a mayúsculas se comportan como en la app.
- **Factory por test cuando hay estado.** `TodosApiTests` y `NotesApiTests` crean una app por test: base limpia y rate limiter en cero. `PipelineTests` y `ErrorsAndCorsTests` comparten una con `IClassFixture` porque no dependen de los datos.
- **El tiempo se inyecta.** `TimeProvider` en la app y `FakeTimeProvider` en los tests: nada de `Thread.Sleep` ni fechas que cambian entre corridas.
- **Mocks solo en los bordes.** NSubstitute reemplaza `IGreeter` para mostrar el patrón; la base nunca se mockea.
- **Cobertura con la extensión de Microsoft.Testing.Platform** (`Microsoft.Testing.Extensions.CodeCoverage`), porque coverlet.collector es de VSTest. `coverage.config` excluye `Migrations/` y lo generado en `obj/`. La ruta del config va absoluta (`$PWD/...`), porque el ejecutable de tests la resuelve desde `bin/`.

## Lo que encontró la suite

- **El rate limit de `/api/notes` (5 cada 10 s) se nota.** Un test que hacía 6 requests al grupo recibió un 429 en la sexta. Se ajustó el test a 5 requests y se sumó uno que verifica el 429 a propósito. En una API real, el límite iría en configuración para poder subirlo en los tests.

## Lo que queda sin cubrir (y por qué)

- `Program.cs`: `Database.Migrate()` y `MapOpenApi()` solo corren en Development. Lo cubre la corrida manual con `dotnet run`.
- `GET /api/demo/slow`: la cancelación por `CancellationToken` necesita cortar la conexión a mitad del request. No vale el costo para un endpoint de demo.

## CI

`backend.yml` corre `dotnet build -warnaserror`, después los tests con cobertura, escribe el porcentaje en el resumen del job y sube `coverage.cobertura.xml` como artefacto. En el bloque 7 este mismo paso se replica en Azure Pipelines con `PublishCodeCoverageResults`.

## Docs oficiales

- [Code coverage con Microsoft.Testing.Platform](https://learn.microsoft.com/dotnet/core/testing/microsoft-testing-platform-extensions-code-coverage)
- [Integration tests en ASP.NET Core](https://learn.microsoft.com/aspnet/core/test/integration-tests)
- [Testing del rate limiting](https://learn.microsoft.com/aspnet/core/performance/rate-limit#testing-endpoints-with-rate-limiting)
- [EF Core: elegir una estrategia de testing](https://learn.microsoft.com/ef/core/testing/choosing-a-testing-strategy)
