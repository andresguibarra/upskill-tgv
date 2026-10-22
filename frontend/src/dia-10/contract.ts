import { createApp, type Component } from 'vue'

// Contrato mínimo entre host y microfrontend: el host no sabe que adentro hay Vue.
export interface MicroFrontend<P = Record<string, unknown>> {
  mount(el: Element, props: P): void
  unmount(): void
}

export function defineMicroFrontend<P extends Record<string, unknown>>(root: Component): MicroFrontend<P> {
  let app: ReturnType<typeof createApp> | null = null
  return {
    mount(el, props) {
      app = createApp(root, props)
      app.mount(el)
    },
    unmount() {
      app?.unmount()
      app = null
    },
  }
}
