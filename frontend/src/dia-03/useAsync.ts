import { ref, shallowRef } from 'vue'

// Reemplaza al típico `loadingMixin` de Vue 2 (data: loading/error + método run).
export function useAsync<T>(fn: () => Promise<T>) {
  const data = shallowRef<T>()
  const error = ref<Error | null>(null)
  const loading = ref(false)

  async function run() {
    loading.value = true
    error.value = null
    try {
      data.value = await fn()
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
    } finally {
      loading.value = false
    }
  }

  return { data, error, loading, run }
}
