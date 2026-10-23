# Memo técnico: microfrontends con Vue 3 y Module Federation

Es el entregable del bloque 4. Es un memo de unas tres páginas para decidir si conviene partir un frontend Vue 3 en microfrontends, y cómo hacerlo. Lo que se afirma acá está probado en el repo: el contrato y los eventos en [`frontend/src/dia-10/`](../frontend/src/dia-10/) y el host con el remote en [`mfe/`](../mfe/), con su ayuda memoria en los días [10](dia-10.md) y [11](dia-11.md).

## 1. Contexto y problema

Un frontend único (monolito) funciona bien mientras lo mantiene un equipo. Cuando lo tocan varios equipos aparecen tres síntomas:

- **Deploys acoplados.** Un cambio chico en un área espera al release de todos, y un bug en otra área bloquea la salida.
- **Dueños difusos.** Nadie es responsable de punta a punta de una parte del producto, y las decisiones técnicas se negocian entre todos.
- **Build y tests que crecen sin parar.** El CI tarda cada vez más y cualquier cambio corre todo.

Los microfrontends parten la UI por **dominio de negocio**, por ejemplo catálogo, carrito y cuenta. Cada parte tiene un equipo dueño, su repo o carpeta, su pipeline y su deploy. Un **host** (shell) las compone en el navegador.

La pregunta del memo no es "¿microfrontends sí o no?", sino **qué problema de organización resuelven y a qué costo técnico**.

## 2. Opciones de integración

| Opción | Cuándo se integra | Deploy independiente | Costo | Encaja cuando |
| --- | --- | --- | --- | --- |
| Monorepo con paquetes (npm, workspaces) | build | no | bajo | un equipo o pocos, con release en conjunto |
| **Module Federation** | runtime | sí | medio | varios equipos con el mismo framework y deploys propios |
| Web Components | runtime | sí | medio | hay frameworks distintos o widgets embebibles en terceros |
| iframe | runtime | sí | bajo de armar, alto en UX | aislamiento total (legacy, contenido de terceros) |

**Recomendación:** Module Federation, siempre que el motivo sea organizacional (equipos que necesitan deployar por separado). Si no lo es, un monorepo con paquetes da casi todo el beneficio de modularidad sin la complejidad del runtime.

## 3. Arquitectura propuesta

```
            ┌──────────── host (shell) ────────────┐
            │ layout, routing, auth, carrito        │
            │   ┌─ RemoteSlot ─┐   ┌─ RemoteSlot ─┐ │
            │   │ catalog/mfe  │   │ account/mfe  │ │
            └───┴──────┬───────┴───┴──────┬───────┴─┘
                       │ import() runtime │
          remoteEntry.js (CDN A)   remoteEntry.js (CDN B)
```

**3.1 El contrato es `mount`/`unmount`, no el componente.** Cada remote expone una función que monta su app en un elemento y otra que la desmonta. El host no sabe si adentro hay Vue, así que un remote puede actualizar Vue o cambiar de framework sin coordinar con el host. Los tipos del contrato se publican como un paquete versionado (en el repo están en `mfe/host/src/remotes.d.ts`).

```ts
export interface MicroFrontend<P> {
  mount(el: Element, props: P): void
  unmount(): void
}
```

**3.2 Comunicación por eventos, estado privado.** Cada microfrontend es dueño de su estado. Lo que cruza de uno a otro son eventos del DOM (`CustomEvent` en `window`) con un mapa de tipos compartido. En la prueba, el botón "Agregar" del catálogo emite `cart:add` y el carrito del host lo escucha. No se comparte un store global entre microfrontends, porque eso vuelve a acoplar los deploys.

**3.3 Dependencias compartidas.** Vue va en `shared` como `singleton` en host y remotes, así se baja una sola vez (verificado en el navegador). Dos instancias de Vue rompen la reactividad y el `provide`/`inject` entre apps. Se acuerda un rango semver (`requiredVersion: '^3.5.0'`) y un major nuevo de Vue se coordina como cambio de plataforma.

**3.4 Fallos aislados.** El host carga cada remote con `import()` dentro de un `try/catch` y muestra un fallback si no responde. En la prueba, con el remote apagado, el shell levantó igual y mostró "El catálogo no está disponible". Ningún remote puede tirar abajo la página.

**3.5 Routing.** El host es dueño del router de primer nivel (`/catalogo/*`, `/cuenta/*`) y le pasa al remote la ruta base por props. Cada remote maneja sus subrutas. Así se evitan dos routers peleando por la URL.

**3.6 Estilos.** Se usa CSS con scope (`<style scoped>` o CSS modules) y un prefijo por microfrontend. Los tokens de diseño (colores, tipografía) se comparten como variables CSS publicadas por el host. No hay estilos globales en los remotes.

## 4. Ciclo de vida y operación

- **Repos y CI:** cada microfrontend tiene su pipeline (en el repo, `mfe.yml` buildea host y remote por separado y solo corre cuando cambia `mfe/`).
- **Deploy:** el remote publica `remoteEntry.js` y sus chunks en su CDN con una URL estable por entorno. El host lee las URLs desde una configuración por entorno, no hardcodeadas, así se puede apuntar a una versión anterior sin rebuildear (rollback).
- **Cache:** `remoteEntry.js` sin cache largo (o con revalidación) y los chunks con hash en el nombre y cache largo.
- **Versionado del contrato:** los cambios que rompen el contrato van con versión nueva del módulo expuesto (`./mfe-v2`) y conviven hasta que el host migre.

## 5. Testing

| Nivel | Qué se prueba | Herramienta |
| --- | --- | --- |
| Unit en cada microfrontend | componentes y composables propios | Vitest + Vue Test Utils (bloque 3) |
| Contrato | `mount`/`unmount` y eventos, sin el host | Vitest (`dia-10.spec.ts`) |
| Integración | host + remotes reales en el navegador: carga, eventos, fallback | Playwright contra los builds (como se verificó el día 11) |

El test de contrato es el que permite deployar por separado: si el remote cumple el contrato, el host no necesita volver a probarse.

## 6. Riesgos y mitigación

| Riesgo | Mitigación |
| --- | --- |
| Más complejidad de build y de debugging | Empezar con un solo remote y medir antes de partir más |
| Versiones incompatibles de dependencias compartidas | `singleton` + `requiredVersion`, y una alerta en CI si los rangos divergen |
| Peso de la página: cada remote suma su runtime y chunks | Presupuesto de bundle por microfrontend y carga diferida por ruta |
| UX inconsistente entre equipos | Design system compartido como paquete y tokens del host |
| Un remote caído | Fallback en el host y monitoreo por remote |

## 7. Cuándo no hacerlo

- Un solo equipo, o varios que de todas formas deployan juntos.
- Un producto chico, donde el overhead de infraestructura supera el beneficio.
- Cuando la motivación es "modularizar el código": para eso alcanzan los paquetes y los límites de importación en un monorepo.

## 8. Recomendación

1. Mantener el monolito como host y **extraer un solo dominio** (por ejemplo, el catálogo) como remote con Module Federation, siguiendo el contrato `mount`/`unmount` de la sección 3.1.
2. Medir durante un ciclo de releases: frecuencia de deploy del remote, incidentes cruzados y peso de la página.
3. Si los números mejoran, extraer el siguiente dominio. Si no, volver a un paquete dentro del monorepo, que es barato porque el contrato es el mismo.

## Referencias

- [Module Federation: documentación](https://module-federation.io/guide/start/index.html) y [plugin de Vite](https://module-federation.io/guide/build-plugins/plugins-vite.html)
- [Cam Jackson, "Micro Frontends", martinfowler.com](https://martinfowler.com/articles/micro-frontends.html)
- [Vue: Application API (`createApp`, `unmount`)](https://vuejs.org/api/application.html)
