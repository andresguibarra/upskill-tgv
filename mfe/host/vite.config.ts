import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { federation } from '@module-federation/vite'

// Host: declara de dónde baja cada remote en runtime.
export default defineConfig({
  plugins: [
    vue(),
    federation({
      name: 'shell',
      remotes: {
        catalog: { type: 'module', name: 'catalog', entry: 'http://localhost:5001/remoteEntry.js' },
      },
      shared: { vue: { singleton: true } },
      dts: false,
    }),
  ],
  build: { target: 'esnext' },
})
