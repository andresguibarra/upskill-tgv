import { onWatcherCleanup, ref, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { api } from './http'

// La URL puede ser string, ref o getter: si cambia, se vuelve a pedir y se aborta la anterior.
export function useFetch<T>(url: MaybeRefOrGetter<string>) {
  const data = shallowRef<T | null>(null)
  const error = shallowRef<Error | null>(null)
  const loading = ref(false)

  async function load(signal?: AbortSignal) {
    loading.value = true
    error.value = null
    try {
      data.value = await api.get<T>(toValue(url), signal)
    } catch (e) {
      if (signal?.aborted) return
      error.value = e instanceof Error ? e : new Error(String(e))
    } finally {
      if (!signal?.aborted) loading.value = false
    }
  }

  watch(
    () => toValue(url),
    () => {
      const controller = new AbortController()
      onWatcherCleanup(() => controller.abort())
      void load(controller.signal)
    },
    { immediate: true },
  )

  return { data, error, loading, refetch: () => load() }
}
