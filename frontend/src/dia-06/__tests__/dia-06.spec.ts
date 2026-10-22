import { afterEach, describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createHttpRepository, createMemoryRepository } from '../repositories'
import { useCrud } from '../useCrud'
import TodoCrud from '../TodoCrud.vue'
import type { Todo } from '../types'

const seed = (): Todo[] => [{ id: 1, title: 'Leer docs', done: false }]

afterEach(() => vi.unstubAllGlobals())

describe('día 6: módulo CRUD tipado', () => {
  it('el repo en memoria hace alta, edición y baja', async () => {
    const repo = createMemoryRepository(seed())
    const created = await repo.create({ title: 'Tests', done: false })
    expect(created.id).toBe(2)
    expect(await repo.update(1, { done: true })).toEqual({ id: 1, title: 'Leer docs', done: true })
    await repo.remove(2)
    expect(await repo.list()).toHaveLength(1)
    await expect(repo.remove(99)).rejects.toMatchObject({ status: 404 })
  })

  it('el repo HTTP usa el verbo y la URL de cada operación', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)
    const repo = createHttpRepository<Todo>('/api/todos')
    await repo.update(3, { done: true })
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/todos/3')
    expect(init).toMatchObject({ method: 'PATCH', body: '{"done":true}' })
  })

  it('useCrud vuelve atrás un borrado si el server falla', async () => {
    const repo = createMemoryRepository(seed())
    repo.remove = () => Promise.reject(new Error('500'))
    const crud = useCrud(repo)
    await crud.load()
    await crud.remove(1)
    expect(crud.items.value).toHaveLength(1)
    expect(crud.error.value).toBe('500')
  })

  it('TodoCrud lista, agrega y marca tareas', async () => {
    const wrapper = mount(TodoCrud, { props: { repo: createMemoryRepository(seed()) } })
    await flushPromises()
    await wrapper.get('input[placeholder="Nueva tarea"]').setValue('Escribir PR')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.findAll('li label').map((l) => l.text())).toEqual(['Leer docs', 'Escribir PR'])

    await wrapper.get('li input[type="checkbox"]').trigger('change')
    await flushPromises()
    expect(wrapper.get<HTMLInputElement>('li input[type="checkbox"]').element.checked).toBe(true)
  })
})
