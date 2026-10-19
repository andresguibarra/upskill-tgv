<!-- Depende de un inject: en el test se provee con global.provide. -->
<script setup lang="ts">
import { useNotifier } from '../dia-03/notifier'

const props = defineProps<{ save: () => Promise<void> }>()
const { notify } = useNotifier()

async function onClick() {
  await props.save()
  notify('Guardado')
}
</script>

<template>
  <button type="button" @click="onClick">Guardar</button>
</template>
