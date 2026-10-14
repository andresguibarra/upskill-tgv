import { inject, type App, type InjectionKey } from 'vue'

export interface Notifier {
  notify: (message: string) => void
}

// provide/inject tipado: la key lleva el tipo, así inject() no devuelve `unknown`.
export const NotifierKey: InjectionKey<Notifier> = Symbol('notifier')

// Plugin: en Vue 2 era Vue.use(plugin) + Vue.prototype.$notify. En Vue 3 se instala por app.
export function createNotifier(notify: Notifier['notify']) {
  const notifier: Notifier = { notify }
  return {
    install(app: App) {
      app.provide(NotifierKey, notifier)
      app.config.globalProperties.$notify = notify
    },
  }
}

export function useNotifier(): Notifier {
  const notifier = inject(NotifierKey)
  if (!notifier) throw new Error('Falta instalar el plugin: app.use(createNotifier(...))')
  return notifier
}

// Tipa `this.$notify` y `$notify` en los templates (reemplaza a Vue.prototype).
declare module 'vue' {
  interface ComponentCustomProperties {
    $notify: Notifier['notify']
  }
}
