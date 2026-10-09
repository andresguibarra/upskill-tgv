# Bloque 1: decisiones técnicas de la migración Vue 2 → Vue 3

Es el documento técnico que pide el entregable del bloque 1. Resume qué se decidió al migrar y por qué. Los ejemplos están en los días [1](dia-01.md), [2](dia-02.md) y [3](dia-03.md).

## Contexto

Hay una base de código en Vue 2 con Options API, mixins, filtros, event bus y plugins sobre `Vue.prototype`. Vue 2 no tiene soporte desde el 31/12/2023. El objetivo es llevarla a Vue 3 + TypeScript sin reescribir la lógica de negocio.

## Decisiones

| # | Decisión | Alternativa descartada | Por qué |
|---|---|---|---|
| 1 | `<script setup lang="ts">` en todos los componentes nuevos o migrados | Mantener Options API | Es menos código, la inferencia de tipos es mejor y la lógica se agrupa por funcionalidad. Options API sigue andando y sirve como paso intermedio. |
| 2 | Props y emits con genéricos (`defineProps<T>()`, `defineEmits<T>()`) | Declaración en runtime (`props: { x: Number }`) | Un solo lugar define el contrato y lo valida el compilador. |
| 3 | Mixins → composables `useX()` | Mantener los mixins | Se ve de dónde sale cada valor, no hay choque de nombres, se pueden tipar con genéricos y testear sin montar. |
| 4 | Filtros → funciones puras (`formatCurrency`) | `globalProperties.$filters` | Son testeables, tipadas y reutilizables fuera del template. |
| 5 | Event bus → eventos tipados entre padre e hijo, y un store (Pinia) para estado global | `mitt` como reemplazo directo | El flujo de datos queda explícito. `mitt` queda solo para casos puntuales. |
| 6 | `v-model` con `defineModel` (y `v-model:arg` en lugar de `.sync`) | `modelValue` + `emit` manual | Una línea, tipada, y permite varios `v-model` por componente. |
| 7 | Plugins con `app.use` + `provide`/`inject` tipado con `InjectionKey` | `globalProperties` | `inject` tiene tipos y se puede reemplazar en tests. `globalProperties` queda solo por compatibilidad. |
| 8 | Migración incremental, componente por componente, con un test de comportamiento antes y después | Reescritura total | Reduce el riesgo, y el test confirma que el comportamiento no cambió. |

## Orden de migración sugerido

1. Subir el build a Vite y el entry a `createApp`. Usar `@vue/compat` si hay muchas dependencias de Vue 2.
2. Migrar plugins y la configuración global (`app.use`, `app.component`, `app.directive`).
3. Migrar primero los componentes hoja, que no tienen hijos, y después hacia arriba.
4. Reemplazar mixins, filtros y event bus a medida que aparecen.
5. Sacar `@vue/compat` cuando no queden warnings.

## Riesgos

- **Librerías solo para Vue 2:** hay que verificar que exista una versión para Vue 3 antes de empezar.
- **`v-if` y `v-for` en el mismo elemento:** cambió la precedencia, así que conviene revisarlos con ESLint (`plugin:vue/vue3-recommended`).
- **`$attrs` ahora incluye `class`, `style` y los listeners:** puede duplicar handlers si se usaba `v-on="$listeners"`.

## Cómo se verificó

Cada ejemplo tiene tests con Vitest y Vue Test Utils. En el día 1 se comparan Options API y `<script setup>` con el mismo test, y el CI corre type-check, tests y build en cada PR.
