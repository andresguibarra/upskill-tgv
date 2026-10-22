<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useCrud } from './useCrud'
import type { Repository, Todo } from './types'

const props = defineProps<{ repo: Repository<Todo> }>()
const { items, error, loading, load, create, update, remove } = useCrud(props.repo)
const title = ref('')

async function add() {
  if (!title.value.trim()) return
  await create({ title: title.value.trim(), done: false })
  title.value = ''
}

onMounted(load)
</script>

<template>
  <form @submit.prevent="add">
    <input v-model="title" placeholder="Nueva tarea" />
    <button type="submit" :disabled="loading">Agregar</button>
  </form>
  <p v-if="error" role="alert">{{ error }}</p>
  <ul>
    <li v-for="todo in items" :key="todo.id">
      <label>
        <input type="checkbox" :checked="todo.done" @change="update(todo.id, { done: !todo.done })" />
        {{ todo.title }}
      </label>
      <button type="button" @click="remove(todo.id)">Borrar</button>
    </li>
  </ul>
</template>
