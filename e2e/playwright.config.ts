import { defineConfig, devices } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Base SQLite propia de la corrida: no toca backend/Upskill.Api/upskill.db.
const db = join(tmpdir(), `upskill-e2e-${Date.now()}.db`)

export default defineConfig({
  testDir: 'tests',
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Levanta la API real y Vite con VITE_TODOS_API=true; el proxy de Vite manda /api a :5101.
  webServer: [
    {
      command: 'dotnet run --project ../backend/Upskill.Api --launch-profile http',
      url: 'http://localhost:5101/health',
      env: { ConnectionStrings__App: `Data Source=${db}`, Database__MigrateOnStartup: 'true' },
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm --prefix ../frontend run dev -- --port 5173 --strictPort',
      url: 'http://localhost:5173',
      env: { VITE_TODOS_API: 'true' },
      reuseExistingServer: !process.env.CI,
    },
  ],
})
