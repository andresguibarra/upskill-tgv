import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import TodoStatsBar from '../TodoStatsBar.vue'

afterEach(() => vi.unstubAllGlobals())

const respond = (body: unknown, status = 200) =>
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json(body, { status })))

describe('día 28: el frontend consume /api/todos/stats', () => {
  it('muestra los conteos que devuelve la API', async () => {
    respond({ total: 3, done: 1, pending: 2 })
    const wrapper = mount(TodoStatsBar)
    await flushPromises()
    expect(wrapper.text()).toContain('Hechas: 1 de 3. Pendientes: 2.')
    expect(vi.mocked(fetch).mock.calls[0]![0]).toBe('/api/todos/stats')
  })

  it('si la API falla, lo dice en vez de mostrar ceros', async () => {
    respond({}, 503)
    const wrapper = mount(TodoStatsBar)
    await flushPromises()
    expect(wrapper.get('[role=alert]').text()).toContain('503')
  })
})
