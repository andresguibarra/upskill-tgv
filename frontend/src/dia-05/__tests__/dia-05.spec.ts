import { afterEach, describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { ApiError, http } from '../http'
import { useFetch } from '../useFetch'
import ErrorBoundary from '../ErrorBoundary.vue'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, statusText: status === 200 ? 'OK' : 'Not Found' })

afterEach(() => vi.unstubAllGlobals())

describe('día 5: composables, APIs y errores', () => {
  it('http lanza ApiError con el status cuando la respuesta no es ok', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}, 404)))
    await expect(http('/x')).rejects.toMatchObject({ name: 'ApiError', status: 404 })
    await expect(http('/x')).rejects.toBeInstanceOf(ApiError)
  })

  it('useFetch vuelve a pedir cuando cambia la URL y aborta la anterior', async () => {
    const fetchMock = vi.fn<typeof fetch>((input) => Promise.resolve(jsonResponse({ url: String(input) })))
    vi.stubGlobal('fetch', fetchMock)

    const id = ref(1)
    const { data, loading } = useFetch<{ url: string }>(() => `/users/${id.value}`)
    expect(loading.value).toBe(true)
    await flushPromises()
    expect(data.value).toEqual({ url: '/users/1' })

    id.value = 2
    await nextTick()
    const firstSignal = fetchMock.mock.calls[0]![1]!.signal!
    expect(firstSignal.aborted).toBe(true)
    await flushPromises()
    expect(data.value).toEqual({ url: '/users/2' })
    expect(loading.value).toBe(false)
  })

  it('useFetch expone el error', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}, 404)))
    const { error } = useFetch('/missing')
    await flushPromises()
    expect(error.value).toBeInstanceOf(ApiError)
  })

  it('ErrorBoundary muestra el fallback si un hijo falla', async () => {
    const Broken = defineComponent({
      setup() {
        throw new Error('render roto')
      },
    })
    const wrapper = mount(ErrorBoundary, { slots: { default: () => h(Broken) } })
    await nextTick()
    expect(wrapper.get('[role=alert]').text()).toBe('Algo falló: render roto')
  })
})
