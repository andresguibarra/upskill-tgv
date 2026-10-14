# Día 3: cerrar la migración

Lo que suele quedar pendiente después de migrar los componentes: mixins, plugins, el `Vue.prototype` global y los hooks renombrados. El código está en [`frontend/src/dia-03/`](../frontend/src/dia-03/). Las decisiones del bloque están en [`bloque-1-decisiones.md`](bloque-1-decisiones.md).

## Mixin → composable genérico

```ts
export function useAsync<T>(fn: () => Promise<T>) {
  const data = shallowRef<T>()
  const error = ref<Error | null>(null)
  const loading = ref(false)
  async function run() { /* loading → try/catch → finally */ }
  return { data, error, loading, run }
}
const { data, loading, run } = useAsync(() => api.getProducts())
```

> El genérico `<T>` hace que `data` quede tipado según lo que devuelve `fn`, algo que con un mixin se perdía. `shallowRef` evita volver reactivo en profundidad un objeto que se reemplaza entero.

## Plugin: `Vue.use` + `Vue.prototype` → `app.use` + `globalProperties`

```ts
export const createNotifier = (notify) => ({
  install(app: App) {
    app.provide(NotifierKey, { notify })
    app.config.globalProperties.$notify = notify
  },
})
createApp(App).use(createNotifier(toast)).mount('#app')
```

> En Vue 3 los plugins se instalan por app y no globalmente, así que dos apps en la misma página no se pisan. `globalProperties` existe para compatibilidad. En código nuevo conviene `provide`/`inject`.

## `provide`/`inject` tipado

```ts
export const NotifierKey: InjectionKey<Notifier> = Symbol('notifier')
const notifier = inject(NotifierKey) // Notifier | undefined
```

> `InjectionKey<T>` lleva el tipo en la key, así que `inject` devuelve `T | undefined` y no `unknown`. Envolverlo en `useNotifier()` con un error claro evita los `!` sueltos.

## Tipar `$notify` en templates y Options API

```ts
declare module 'vue' {
  interface ComponentCustomProperties { $notify: (msg: string) => void }
}
```

> Es module augmentation: le agrega la propiedad a `this` y a los templates. Sin esto, `this.$notify` da error de tipos.

## Hooks y APIs renombrados

| Vue 2 | Vue 3 |
|---|---|
| `beforeDestroy` / `destroyed` | `beforeUnmount` / `unmounted` (`onBeforeUnmount` / `onUnmounted`) |
| `Vue.component('X', X)` | `app.component('X', X)` |
| `Vue.directive` (`bind`, `inserted`, `update`) | `app.directive` (`beforeMount`, `mounted`, `updated`) |
| `() => import('./X.vue')` como componente | `defineAsyncComponent(() => import('./X.vue'))` |
| `$listeners` + `inheritAttrs` | Todo llega por `$attrs` (`useAttrs()`) |
| `$children` | Eliminado: se usan template refs |

## Documentación oficial

- [Vue: TypeScript con Composition API](https://vuejs.org/guide/typescript/composition-api.html) (el recurso del plan, incluye `InjectionKey`)
- [Plugins](https://vuejs.org/guide/reusability/plugins.html)
- [Provide / Inject](https://vuejs.org/guide/components/provide-inject.html)
- [Tipar propiedades globales](https://vuejs.org/guide/typescript/options-api.html#augmenting-global-properties)
- [Migración: Global API](https://v3-migration.vuejs.org/breaking-changes/global-api.html)
