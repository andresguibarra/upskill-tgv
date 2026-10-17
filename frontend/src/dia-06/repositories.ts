import { ApiError, http } from '../dia-05/http'
import type { Draft, Entity, Patch, Repository } from './types'

export function createMemoryRepository<T extends Entity>(seed: T[] = []): Repository<T> {
  const items = new Map<T['id'], T>(seed.map((item) => [item.id, item]))
  let nextId = Math.max(0, ...items.keys()) + 1

  const find = (id: T['id']) => {
    const item = items.get(id)
    if (!item) throw new ApiError(404, `No existe ${id}`)
    return item
  }

  return {
    list: async () => [...items.values()],
    create: async (draft) => {
      const item = { ...draft, id: nextId++ } as T
      items.set(item.id, item)
      return item
    },
    update: async (id, patch) => {
      const item = { ...find(id), ...patch }
      items.set(id, item)
      return item
    },
    remove: async (id) => {
      find(id)
      items.delete(id)
    },
  }
}

export function createHttpRepository<T extends Entity>(baseUrl: string): Repository<T> {
  const send = <R>(url: string, method: string, body?: Draft<T> | Patch<T>) =>
    http<R>(url, { method, body: body && JSON.stringify(body) })

  return {
    list: () => http<T[]>(baseUrl),
    create: (draft) => send<T>(baseUrl, 'POST', draft),
    update: (id, patch) => send<T>(`${baseUrl}/${id}`, 'PATCH', patch),
    remove: (id) => send<void>(`${baseUrl}/${id}`, 'DELETE'),
  }
}
