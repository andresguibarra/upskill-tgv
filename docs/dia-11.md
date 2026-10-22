# Día 11: Module Federation en la práctica

Un host y un remote reales con [`@module-federation/vite`](https://module-federation.io/guide/build-plugins/plugins-vite.html), en [`mfe/`](../mfe/). Se probaron en Chromium: el host carga el catálogo, el botón del remote suma al carrito del host, Vue se baja una sola vez y, con el remote apagado, aparece el fallback. Cómo levantarlo está en [`mfe/README.md`](../mfe/README.md).

## Remote: qué expone

```ts
// mfe/remote/vite.config.ts
federation({
  name: 'catalog',
  filename: 'remoteEntry.js',
  exposes: { './mfe': './src/mfe.ts' },     // el contrato mount/unmount del día 10
  shared: { vue: { singleton: true } },
})
base: 'http://localhost:5001/'              // los chunks se piden con URL absoluta
```

> Se expone el contrato y no el componente, así el host no depende de que el remote use Vue. `base` absoluta hace falta porque los chunks del remote se cargan desde la página del host.

## Host: de dónde lo baja

```ts
// mfe/host/vite.config.ts
remotes: {
  catalog: { type: 'module', name: 'catalog', entry: 'http://localhost:5001/remoteEntry.js' },
}
```

```ts
// mfe/host/src/remotes.d.ts
declare module 'catalog/mfe' {
  export function mount(el: Element, props: { user: string }): void
  export function unmount(): void
}
```

> La URL del `entry` se resuelve en runtime: el remote se puede re-deployar sin rebuildear el host. Los tipos del contrato se declaran a mano. En un proyecto real van en un paquete compartido, o se generan con el plugin de tipos de Module Federation (`dts`, que acá está apagado porque suma unos 8 s al build).

## Cargar con fallback

```ts
onMounted(async () => {
  try {
    const remote = await import('catalog/mfe')
    remote.mount(el.value!, { user: props.user })
    unmount = remote.unmount
  } catch {
    failed.value = true      // el remote no respondió: el shell sigue andando
  }
})
onUnmounted(() => unmount?.())
```

> Un remote caído no puede tirar abajo al host. El `import()` dinámico es el punto donde se aísla el fallo, y el `unmount` evita dejar una app Vue colgada al navegar.

## `shared` y el singleton

```ts
shared: { vue: { singleton: true } }      // en los dos lados
```

> Con `singleton`, host y remote usan la misma instancia de Vue (en la prueba se bajó un solo chunk de Vue). Sin eso, un remote con otra versión trae su propio Vue, y la reactividad y el `provide`/`inject` no cruzan entre apps. Conviene acordar un rango semver y sumar `requiredVersion` cuando haya varios equipos.

## CI

`.github/workflows/mfe.yml` buildea las dos apps (type-check + build) en una matriz, y solo corre cuando cambia algo en `mfe/`.

## Documentación oficial

- [Module Federation: plugin de Vite](https://module-federation.io/guide/build-plugins/plugins-vite.html)
- [Module Federation: configuración `shared`](https://module-federation.io/configure/shared.html) y [`remotes`](https://module-federation.io/configure/remotes.html)
- [Vite: `base`](https://vite.dev/config/shared-options.html#base)
