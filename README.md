# upskill-tgv

Plan de upskilling Full Stack de 30 días: Vue 3 + TypeScript, testing, ASP.NET Core, Azure CI/CD e IA.
Cada día del plan entra como un PR con código y su ayuda memoria en `docs/`.

## Estructura

- `frontend/`: app Vue 3 + TypeScript (Vite, Vitest, Vue Test Utils)
- `docs/`: ayuda memoria de cada día
- `backend/`: API ASP.NET Core (llega en el bloque 5)

## Frontend

```bash
cd frontend
npm install
npm run dev          # servidor local
npm run type-check   # vue-tsc
npx vitest run       # tests
npm run build
```
