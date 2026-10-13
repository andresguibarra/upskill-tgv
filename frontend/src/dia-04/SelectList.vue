<!-- Componente genérico: T se infiere de `items` en cada uso. -->
<script setup lang="ts" generic="T extends Entity">
import type { Entity } from './types'

const props = withDefaults(
  defineProps<{
    items: T[]
    size?: 'sm' | 'md'
    disabledIds?: T['id'][]
  }>(),
  { size: 'md', disabledIds: () => [] },
)

const selected = defineModel<T | null>({ default: null })
const emit = defineEmits<{ select: [item: T] }>()

defineSlots<{ item(props: { item: T; selected: boolean }): unknown }>()

function pick(item: T) {
  if (props.disabledIds.includes(item.id)) return
  selected.value = item
  emit('select', item)
}

defineExpose({ clear: () => (selected.value = null) })
</script>

<template>
  <ul :class="size">
    <li v-for="item in items" :key="item.id" @click="pick(item)">
      <slot name="item" :item="item" :selected="item.id === selected?.id">{{ item.id }}</slot>
    </li>
  </ul>
</template>
