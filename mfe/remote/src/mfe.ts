import { createApp, type App } from 'vue'
import CatalogList from './CatalogList.vue'

// El mismo contrato del día 10: el host solo llama a mount/unmount.
let app: App | null = null

export function mount(el: Element, props: { user: string }) {
  app = createApp(CatalogList, props)
  app.mount(el)
}

export function unmount() {
  app?.unmount()
  app = null
}
