---
description: Generar tests de integración para un endpoint de la API
agent: agent
tools: ['search/codebase', 'read/readFile', 'edit/editFiles', 'execute/runInTerminal', 'execute/testFailure']
---

Escribí tests de integración para el endpoint ${input:endpoint:por ejemplo PATCH /api/todos/{id}}.

1. Leé el endpoint y su servicio en `backend/Upskill.Api/` y los tests existentes en [TodosApiTests.cs](../../backend/Upskill.Api.Tests/Integration/TodosApiTests.cs) para seguir el mismo estilo.
2. Cubrí el caso feliz, la validación (400 con ProblemDetails) y el 404.
3. Usá `ApiFactory` y un cliente nuevo por test si el test modifica datos.
4. Corré `dotnet test` desde `backend/` y arreglá lo que falle antes de terminar.
