import { computed, ref, shallowRef, type Ref } from 'vue'
import type { Draft, Entity, Patch, Repository } from './types'

export function useCrud<T extends Entity>(repo: Repository<T>) {
  const items = ref([]) as Ref<T[]>
  const error = shallowRef<string | null>(null)
  const pending = ref(0)
  const loading = computed(() => pending.value > 0)

  async function run<R>(action: () => Promise<R>): Promise<R | undefined> {
    pending.value++
    error.value = null
    try {
      return await action()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      pending.value--
    }
  }

  const load = () => run(async () => (items.value = await repo.list()))

  const create = (draft: Draft<T>) =>
    run(async () => {
      const item = await repo.create(draft)
      items.value = [...items.value, item]
      return item
    })

  const update = (id: T['id'], patch: Patch<T>) =>
    run(async () => {
      const item = await repo.update(id, patch)
      items.value = items.value.map((i) => (i.id === id ? item : i))
      return item
    })

  // Optimista: saca el item ya y lo devuelve si el server falla.
  async function remove(id: T['id']) {
    const before = items.value
    items.value = before.filter((i) => i.id !== id)
    const ok = await run(async () => {
      await repo.remove(id)
      return true
    })
    if (!ok) items.value = before
  }

  return { items, error, loading, load, create, update, remove }
}
