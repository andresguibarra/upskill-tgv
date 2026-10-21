# Día 10: arquitectura y microfrontends (repaso)

Primer día del bloque 4: los conceptos que hacen falta para el memo técnico del día 12. Los dos patrones que no dependen de la herramienta (contrato de montaje y eventos) están en [`frontend/src/dia-10/`](../frontend/src/dia-10/) con tests. Module Federation se arma mañana, en el día 11.

## Formas de integrar microfrontends

| Integración | Cuándo se resuelve | A favor | En contra |
| --- | --- | --- | --- |
| Paquete npm | build | simple, tipado, un solo bundle | cada cambio obliga a re-deployar el host |
| Module Federation | runtime | deploy independiente, comparte deps | config compleja, versiones de `shared` |
| Web Components | runtime | agnóstico de framework, encapsulado | SSR y estilos más difíciles |
| iframe | runtime | aislamiento total | UX, routing y comunicación pobres |

> La pregunta clave no es técnica: si los equipos no necesitan deployar por separado, un monorepo con paquetes suele alcanzar y es más barato.

## Contrato de montaje: `mount` / `unmount`

```ts
export interface MicroFrontend<P> {
  mount(el: Element, props: P): void
  unmount(): void
}
export function defineMicroFrontend<P>(root: Component): MicroFrontend<P> {
  let app: App | null = null
  return {
    mount: (el, props) => { app = createApp(root, props); app.mount(el) },
    unmount: () => { app?.unmount(); app = null },
  }
}
```

> El host solo conoce este contrato, no sabe si adentro hay Vue, React o vanilla. Así un remote puede migrar de framework sin tocar al host.

## Comunicación entre microfrontends

```ts
interface MfeEvents { 'cart:add': { sku: string; qty: number }; 'auth:logout': undefined }

emit('cart:add', { sku: 'ABC-1', qty: 1 })
const off = on('cart:add', ({ sku }) => console.log(sku))
off()   // en el unmount
```

> Eventos del DOM (`CustomEvent` en `window`) en vez de un store compartido: cada MFE es dueño de su estado y solo se comparte el contrato de eventos (el tipo `MfeEvents`, publicado como paquete).

## Module Federation en una línea por concepto

```ts
// remote: vite.config.ts
federation({ name: 'catalog', filename: 'remoteEntry.js', exposes: { './Catalog': './src/mfe.ts' }, shared: ['vue'] })
// host: vite.config.ts
federation({ name: 'shell', remotes: { catalog: 'catalog@http://localhost:5001/remoteEntry.js' }, shared: ['vue'] })
// host: uso
const { default: catalog } = await import('catalog/Catalog')
```

> El **remote** expone módulos en un `remoteEntry.js` y el **host** los carga en runtime. `shared` evita bajar Vue dos veces: tiene que ser singleton, porque dos instancias de Vue rompen la reactividad y el `provide`/`inject`.

## Decisiones que van al memo

- **Dueños:** un equipo por microfrontend, cortado por dominio de negocio y no por capa técnica.
- **Contrato:** `mount`/`unmount`, props tipadas y eventos versionados.
- **Dependencias compartidas:** Vue como singleton y rangos semver acordados.
- **Fallos:** si un remote no carga, el host muestra un fallback (el error boundary del día 5).
- **Estilos:** CSS con scope o prefijos por MFE, sin estilos globales.

## Documentación oficial

- [Module Federation: introducción](https://module-federation.io/guide/start/index.html) y [plugin de Vite](https://module-federation.io/guide/build-plugins/plugins-vite.html)
- [martinfowler.com: Micro Frontends](https://martinfowler.com/articles/micro-frontends.html)
- [Vue: `createApp` y `app.unmount`](https://vuejs.org/api/application.html)
- [MDN: `CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent)
