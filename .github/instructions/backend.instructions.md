---
applyTo: "backend/**"
description: Convenciones de la API .NET y sus tests
---

- .NET 10 con Minimal APIs: endpoints en un `MapGroup` por recurso, respuestas con `TypedResults` y `Results<...>`.
- Validación con DataAnnotations en los DTOs (`AddValidation()`); errores como ProblemDetails, nunca strings sueltos.
- La lógica va en un servicio (`TodoService`), no en el endpoint. No expongas la entidad de EF Core: usá DTOs.
- Para la hora usá `TimeProvider` inyectado, no `DateTime.Now`.
- Tests con xUnit v3 sobre Microsoft.Testing.Platform:
  - unit tests contra SQLite en memoria (`Unit/SqliteDb.cs`), no el provider InMemory;
  - integración con `WebApplicationFactory<Program>` (`Integration/ApiFactory.cs`) y mocks con NSubstitute.
- Nombres de tests: método y comportamiento en español, por ejemplo `Patch_de_un_id_inexistente_devuelve_null`.
