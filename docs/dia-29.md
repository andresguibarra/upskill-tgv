# Día 29: proyecto integrador en la práctica (E2E con Playwright)

Un test que recorre la app como un usuario, con el stack real: Vite con `VITE_TODOS_API=true` y la API .NET con su propia base SQLite. Vive en `e2e/` y corre en CI (`.github/workflows/e2e.yml`).

## 1. Playwright levanta los dos servers

```ts
// e2e/playwright.config.ts
webServer: [
  {
    command: 'dotnet run --project ../backend/Upskill.Api --launch-profile http',
    url: 'http://localhost:5101/health',                     // espera a que /health responda
    env: { ConnectionStrings__App: `Data Source=${db}` },     // base propia de la corrida
  },
  { command: 'npm --prefix ../frontend run dev -- --port 5173 --strictPort', env: { VITE_TODOS_API: 'true' } },
],
```

`webServer` acepta un array y espera cada `url` antes de correr los tests. `ConnectionStrings__App` pisa `appsettings.json` (el `__` es el `:` de la configuración), así el E2E no ensucia `upskill.db`. Fuera de CI, `reuseExistingServer` usa lo que ya tengas levantado.

## 2. El test: locators por rol, no por CSS

```ts
await page.getByPlaceholder('Nueva tarea').fill(title)
await page.getByRole('button', { name: 'Agregar' }).click()
const item = page.getByRole('listitem').filter({ hasText: title })
await expect(item).toBeVisible()          // reintenta solo hasta que aparece
```

Los `expect` web-first (`toBeVisible`, `toBeChecked`) reintentan hasta el timeout, así que no hace falta `waitForTimeout`. Los locators por rol se rompen solo si cambia lo que ve el usuario, no la estructura del DOM.

## 3. El flaky que apareció, y su causa

```ts
const patched = page.waitForResponse((r) => r.request().method() === 'PATCH' && r.ok())
await item.getByRole('checkbox').check()
await patched
await page.reload()   // si sobrevive al reload, lo guardó la API
```

La primera versión hacía `check()` y enseguida `reload()`. Falló en la primera corrida: el reload cortó el PATCH antes de que llegara al server. No era un problema de timing a resolver con un sleep. El test tiene que esperar la respuesta del PATCH. Con el arreglo pasó 3 de 3 corridas seguidas con `--retries=0`, y en CI quedó sin retries para que un flaky se vea en vez de esconderse.

## 4. API directa para lo que la UI no muestra

```ts
const res = await request.post('http://localhost:5101/api/todos', { data: { title: '' } })
expect(res.status()).toBe(400)
expect(res.headers()['content-type']).toContain('application/problem+json')
```

El fixture `request` pega a la API sin navegador, en el mismo test. Sirve para preparar datos o para chequear un contrato (ProblemDetails) que la UI no expone.

## 5. Correrlo

```bash
cd e2e && npm ci && npx playwright install chromium
npx playwright test                 # headless, levanta API y Vite
npx playwright test --ui            # modo UI: timeline, DOM y red de cada paso
npx playwright show-trace test-results/**/trace.zip   # trace de un fallo
```

En CI, si falla, se sube `playwright-report` y `test-results` como artefacto, con el trace del intento fallido.

## Dónde encaja

| Capa | Qué prueba | Dónde |
| --- | --- | --- |
| Unit | lógica de servicio y composables | `backend/*Tests/Unit`, `frontend/**/__tests__` |
| Integración | HTTP + EF en memoria | `WebApplicationFactory` |
| Smoke | la API real levantada | `scripts/smoke.sh` (#29) |
| E2E | navegador → Vite → API → SQLite | `e2e/` (hoy) |

Mañana: el entregable, el README del proyecto y el guion de la demo técnica.

## Docs oficiales

- [Playwright: `webServer`](https://playwright.dev/docs/test-webserver)
- [Playwright: locators](https://playwright.dev/docs/locators)
- [Playwright: assertions web-first](https://playwright.dev/docs/test-assertions)
- [Playwright: API testing (`request`)](https://playwright.dev/docs/api-testing)
- [Playwright: CI con GitHub Actions](https://playwright.dev/docs/ci-intro)
- [ASP.NET Core: configuración por variables de entorno](https://learn.microsoft.com/aspnet/core/fundamentals/configuration/#non-prefixed-environment-variables)
