import { onMounted, onUnmounted, ref } from 'vue'

// Composable con lifecycle: para testearlo hace falta montarlo (ver withSetup).
export function useOnline() {
  const online = ref(navigator.onLine)
  const update = () => (online.value = navigator.onLine)

  onMounted(() => {
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
  })
  onUnmounted(() => {
    window.removeEventListener('online', update)
    window.removeEventListener('offline', update)
  })

  return online
}
