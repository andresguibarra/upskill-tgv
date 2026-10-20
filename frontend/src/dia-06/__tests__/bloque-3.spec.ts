// Entregable del bloque 3: suite del módulo CRUD del día 6 (repos, composable y componente).
import { afterEach, describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createHttpRepository, createMemoryRepository } from '../repositories'
import { useCrud } from '../useCrud'
import TodoCrud from '../TodoCrud.vue'
import { ApiError } from '../../dia-05/http'
import type { Repository, Todo } from '../types'

const todos = (): Todo[] => [
  { id: 1, title: 'Leer docs', done: false },
  { id: 5, title: 'Escribir tests', done: true },
]

const respond = (body: unknown, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(body), { status })

// Promesa que se resuelve a mano: sirve para mirar el estado "en vuelo".
function deferred<T = void>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)))
  return { promise, resolve, reject }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('repo en memoria', () => {
  it('arranca vacío y numera desde 1', async () => {
    const repo = createMemoryRepository<Todo>()
    expect(await repo.list()).toEqual([])
    expect((await repo.create({ title: 'a', done: false })).id).toBe(1)
  })

  it('sigue numerando después del id más alto del seed', async () => {
    const repo = createMemoryRepository(todos())
    expect((await repo.create({ title: 'b', done: false })).id).toBe(6)
  })

  it('update mezcla el patch sin perder los otros campos', async () => {
    const repo = createMemoryRepository(todos())
    expect(await repo.update(5, { title: 'Escribir más tests' })).toEqual({ id: 5, title: 'Escribir más tests', done: true })
  })

  it('update y remove de un id inexistente fallan con ApiError 404', async () => {
    const repo = createMemoryRepository(todos())
    await expect(repo.update(99, { done: true })).rejects.toBeInstanceOf(ApiError)
    await expect(repo.remove(99)).rejects.toMatchObject({ status: 404 })
  })
})

describe('repo HTTP', () => {
  it('list hace GET a la URL base', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(respond(todos()))
    vi.stubGlobal('fetch', fetchMock)
    expect(await createHttpRepository<Todo>('/api/todos').list()).toHaveLength(2)
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/todos')
  })

  it('create hace POST con el draft en el body', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(respond({ id: 9, title: 'x', done: false }))
    vi.stubGlobal('fetch', fetchMock)
    await createHttpRepository<Todo>('/api/todos').create({ title: 'x', done: false })
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ method: 'POST', body: '{"title":"x","done":false}' })
  })

  it('remove acepta un 204 sin body', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(respond(null, 204)))
    await expect(createHttpRepository<Todo>('/api/todos').remove(1)).resolves.toBeUndefined()
  })

  it('un 500 del server llega como ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(respond({}, 500)))
    await expect(createHttpRepository<Todo>('/api/todos').list()).rejects.toMatchObject({ status: 500 })
  })
})

describe('useCrud', () => {
  it('load trae los items y apaga loading al terminar', async () => {
    const crud = useCrud(createMemoryRepository(todos()))
    const pending = crud.load()
    expect(crud.loading.value).toBe(true)
    await pending
    expect(crud.loading.value).toBe(false)
    expect(crud.items.value.map((t) => t.id)).toEqual([1, 5])
  })

  it('loading sigue en true mientras quede algún pedido en vuelo', async () => {
    const repo = createMemoryRepository(todos())
    const slow = deferred<Todo[]>()
    const crud = useCrud({ ...repo, list: () => slow.promise })
    const first = crud.load()
    await crud.create({ title: 'rápido', done: false })
    expect(crud.loading.value).toBe(true)
    slow.resolve([])
    await first
    expect(crud.loading.value).toBe(false)
  })

  it('create agrega al final y update reemplaza en su lugar', async () => {
    const crud = useCrud(createMemoryRepository(todos()))
    await crud.load()
    await crud.create({ title: 'nuevo', done: false })
    await crud.update(1, { done: true })
    expect(crud.items.value.map((t) => [t.id, t.done])).toEqual([[1, true], [5, true], [6, false]])
  })

  it('remove saca el item antes de que responda el server', async () => {
    const repo = createMemoryRepository(todos())
    const server = deferred()
    const crud = useCrud<Todo>({ ...repo, remove: () => server.promise })
    await crud.load()
    const pending = crud.remove(1)
    expect(crud.items.value.map((t) => t.id)).toEqual([5])
    server.resolve()
    await pending
    expect(crud.error.value).toBeNull()
  })

  it('un error deja el mensaje y el próximo pedido OK lo limpia', async () => {
    const repo: Repository<Todo> = createMemoryRepository(todos())
    const crud = useCrud(repo)
    await crud.update(99, { done: true })
    expect(crud.error.value).toBe('No existe 99')
    await crud.load()
    expect(crud.error.value).toBeNull()
  })
})

describe('TodoCrud', () => {
  it('no agrega tareas vacías ni con solo espacios', async () => {
    const repo = createMemoryRepository<Todo>()
    const create = vi.spyOn(repo, 'create')
    const wrapper = mount(TodoCrud, { props: { repo } })
    await wrapper.get('input').setValue('   ')
    await wrapper.get('form').trigger('submit')
    expect(create).not.toHaveBeenCalled()
  })

  it('muestra el error si falla la carga', async () => {
    const repo = createMemoryRepository<Todo>()
    repo.list = () => Promise.reject(new ApiError(503, 'Servicio no disponible'))
    const wrapper = mount(TodoCrud, { props: { repo } })
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('Servicio no disponible')
  })

  it('deshabilita Agregar mientras hay un pedido en vuelo', async () => {
    const slow = deferred<Todo[]>()
    const repo = { ...createMemoryRepository<Todo>(), list: () => slow.promise }
    const wrapper = mount(TodoCrud, { props: { repo } })
    await flushPromises()
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    slow.resolve([])
    await flushPromises()
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('Borrar saca la tarea de la lista', async () => {
    const wrapper = mount(TodoCrud, { props: { repo: createMemoryRepository(todos()) } })
    await flushPromises()
    await wrapper.findAll('li')[0]!.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('li label').map((l) => l.text())).toEqual(['Escribir tests'])
  })
})
