<!-- Uso: T = User se infiere; el slot y el evento quedan tipados con User. -->
<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import SelectList from './SelectList.vue'
import type { User } from './types'

defineProps<{ users: User[] }>()

const current = ref<User | null>(null)
const list = useTemplateRef<{ clear: () => void }>('list')
</script>

<template>
  <SelectList ref="list" v-model="current" :items="users" :disabled-ids="[3]" size="sm">
    <template #item="{ item, selected }">
      <strong v-if="selected">{{ item.name }}</strong>
      <span v-else>{{ item.name }} ({{ item.role }})</span>
    </template>
  </SelectList>
  <button @click="list?.clear()">Limpiar</button>
</template>
