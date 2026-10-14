<script setup lang="ts">
import { ref } from 'vue'
import OptionsCounter from './dia-01/OptionsCounter.vue'
import SetupCounter from './dia-01/SetupCounter.vue'
import SearchBox from './dia-01/SearchBox.vue'

const search = ref('')
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
  </main>
</template>
