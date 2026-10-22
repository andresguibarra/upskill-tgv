import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { federation } from '@module-federation/vite'

// Remote: expone su contrato de montaje en remoteEntry.js.
export default defineConfig({
  base: 'http://localhost:5001/',
  plugins: [
    vue(),
    federation({
      name: 'catalog',
      filename: 'remoteEntry.js',
      exposes: { './mfe': './src/mfe.ts' },
      shared: { vue: { singleton: true } },
      dts: false,
    }),
  ],
  build: { target: 'esnext' },
})
