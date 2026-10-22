<script setup lang="ts">
import { ref } from 'vue'
import OptionsCounter from './dia-01/OptionsCounter.vue'
import SetupCounter from './dia-01/SetupCounter.vue'
import SearchBox from './dia-01/SearchBox.vue'
import TodoCrud from './dia-06/TodoCrud.vue'
import { createMemoryRepository } from './dia-06/repositories'
import type { Todo } from './dia-06/types'

const search = ref('')
const todoRepo = createMemoryRepository<Todo>([{ id: 1, title: 'Repasar el bloque 2', done: false }])
</script>

<template>
  <main>
    <h1>Upskill TGV</h1>
    <p>Demos del plan de 30 días. Ver <code>docs/</code> en la raíz del repo.</p>

    <section>
      <h2>Día 1: Vue 2 → Vue 3</h2>
      <p>Options API: <OptionsCounter :start="1" /></p>
      <p>Composition API: <SetupCounter :start="1" /></p>
      <p><SearchBox v-model="search" /> {{ search }}</p>
    </section>

    <section>
      <h2>Día 6: CRUD tipado</h2>
      <TodoCrud :repo="todoRepo" />
    </section>
  </main>
</template>
