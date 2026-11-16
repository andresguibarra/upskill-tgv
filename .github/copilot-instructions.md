# Instrucciones para Copilot en upskill-tgv

Repo de práctica full stack: frontend Vue 3 + TypeScript en `frontend/` y API ASP.NET Core 10 en `backend/`.

- Respondé y comentá en español. Los nombres de código van en inglés.
- Cambios chicos y enfocados: no reformatees ni renombres lo que no se pidió.
- Antes de dar algo por terminado, corré `scripts/check.sh` (verifica solo las áreas que tocaste, igual que el CI):
  - frontend: type-check, Vitest, ESLint y oxlint
  - backend: `dotnet build -warnaserror` y `dotnet test`
- No agregues dependencias nuevas sin decir por qué hacen falta.
- Cada día del plan tiene su carpeta (`frontend/src/dia-XX/`) y su cheat sheet en `docs/`.
