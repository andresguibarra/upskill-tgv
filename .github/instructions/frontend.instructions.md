---
applyTo: "frontend/**"
description: Convenciones de Vue 3 + TypeScript y sus tests
---

- Vue 3 con `<script setup lang="ts">`, `defineProps`/`defineEmits` tipados y `defineModel` para v-model.
- Lógica reutilizable en composables `useXxx.ts` que devuelven refs, no reactive sueltos.
- Nada de `any`: si un tipo no se conoce, usá `unknown` y estrechalo.
- Tests con Vitest + Vue Test Utils en `__tests__/` junto al código. Probá lo que ve el usuario (texto, eventos emitidos), no el estado interno.
- Para HTTP en tests, mockeá `fetch` con `vi.stubGlobal`, no la librería de red.
