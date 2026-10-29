import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  // En dev, /api va al backend .NET (backend/Upskill.Api, puerto 5101): mismo origen, sin CORS.
  server: {
    proxy: { '/api': 'http://localhost:5101' },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
