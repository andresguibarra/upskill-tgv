import { createApp } from 'vue'

// Monta una app vacía para correr un composable que usa lifecycle hooks o inject.
export function withSetup<T>(composable: () => T) {
  let result!: T
  const app = createApp({
    setup() {
      result = composable()
      return () => null
    },
  })
  app.mount(document.createElement('div'))
  return [result, app] as const
}
