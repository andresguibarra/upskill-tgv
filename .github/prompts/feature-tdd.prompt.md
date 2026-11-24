---
description: Implementar una feature chica del backend con TDD, en commits rojo, verde y refactor
agent: agent
tools: ['search/codebase', 'read/readFile', 'edit/editFiles', 'execute/runInTerminal', 'execute/testFailure']
---

Feature: ${input:feature:por ejemplo DELETE /api/todos/completed borra las hechas y devuelve cuántas}

1. **Plan.** Leé el endpoint y el servicio parecidos en `backend/Upskill.Api/Todos/` y sus tests. Proponé en 3 a 5 líneas qué tests vas a escribir (casos feliz, borde y error) y esperá mi OK antes de editar.
2. **Rojo.** Escribí solo los tests, siguiendo el estilo de `TodoServiceTests.cs` y `TodosApiTests.cs`. Corré `dotnet build` desde `backend/` y mostrame que falla por lo que falta, no por otra cosa. Parate para que yo commitee.
3. **Verde.** Implementá lo mínimo para que pasen **sin tocar los tests**. Corré `dotnet build -warnaserror` y `dotnet test`. Parate para que yo commitee.
4. **Refactor (si hace falta).** Mejorá sin cambiar comportamiento y mostrá la evidencia del porqué (por ejemplo el SQL generado). Los mismos tests tienen que seguir en verde.
5. Al final, listá los archivos tocados y qué no pudiste verificar.
