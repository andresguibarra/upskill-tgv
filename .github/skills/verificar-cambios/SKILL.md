---
name: verificar-cambios
description: Verifica un cambio en upskill-tgv antes de darlo por terminado o abrir un PR. Usar después de editar código del frontend, del backend, del pipeline de Azure o de los hooks.
---

# Verificar cambios

1. Corré `scripts/check.sh changed` desde la raíz del repo. Detecta qué áreas tocaste respecto de `origin/main` y corre los mismos checks que el CI:
   - `frontend/`: type-check, Vitest, ESLint y oxlint (sin `--fix`)
   - `backend/`: `dotnet build -warnaserror` y `dotnet test`
   - `azure-pipelines.yml` o `pipelines/`: el validador de schema
   - `.github/hooks/` o `scripts/`: los tests de los hooks
2. Si algo falla, arreglá la causa en el código. No cambies un test para que pase, salvo que el test esté mal; en ese caso, explicá por qué.
3. Reportá qué corriste y el resultado, con el número de tests. Si un área no se pudo verificar (por ejemplo, falta el SDK de .NET), decilo en lugar de darla por buena.
