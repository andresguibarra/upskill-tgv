import { computed, ref, watch, type Ref } from 'vue'

// Composable: lógica con estado reutilizable. Reemplaza a los mixins de Vue 2.
export function useCounter(start = 0, onChange?: (value: number) => void) {
  const count: Ref<number> = ref(start)
  const double = computed(() => count.value * 2)
  const inc = () => count.value++

  if (onChange) watch(count, onChange)

  return { count, double, inc }
}
