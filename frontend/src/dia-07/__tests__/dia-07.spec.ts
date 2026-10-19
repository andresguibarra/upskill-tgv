import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import DebouncedSearch from '../DebouncedSearch.vue'
import SaveButton from '../SaveButton.vue'
import { useOnline } from '../useOnline'
import { withSetup } from './withSetup'
import { NotifierKey } from '../../dia-03/notifier'
import SelectList from '../../dia-04/SelectList.vue'
import UserPicker from '../../dia-04/UserPicker.vue'
import type { User } from '../../dia-04/types'
import { createHttpRepository } from '../../dia-06/repositories'
import { http } from '../../dia-05/http'

// vi.mock se "hoistea": reemplaza el módulo antes de los imports de arriba.
vi.mock('../../dia-05/http', () => ({ http: vi.fn<typeof import('../../dia-05/http').http>() }))

const users: User[] = [
  { id: 1, name: 'Ana', email: 'ana@x.com', role: 'admin' },
  { id: 2, name: 'Beto', email: 'beto@x.com', role: 'viewer' },
]

describe('días 7 y 8: testing frontend', () => {
  describe('timers falsos', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('emite después del debounce, no antes', async () => {
      const wrapper = mount(DebouncedSearch)
      await wrapper.get('input').setValue('vue ')
      vi.advanceTimersByTime(299)
      expect(wrapper.emitted('search')).toBeUndefined()
      vi.advanceTimersByTime(1)
      expect(wrapper.emitted('search')).toEqual([['vue']])
    })

    it('solo emite la última búsqueda si se tipea rápido', async () => {
      const wrapper = mount(DebouncedSearch, { props: { delay: 100 } })
      await wrapper.get('input').setValue('a')
      await wrapper.get('input').setValue('ab')
      vi.runAllTimers()
      expect(wrapper.emitted('search')).toEqual([['ab']])
    })
  })

  it('global.provide reemplaza al plugin', async () => {
    const notify = vi.fn<(message: string) => void>()
    const save = vi.fn<() => Promise<void>>().mockResolvedValue()
    const wrapper = mount(SaveButton, {
      props: { save },
      global: { provide: { [NotifierKey as symbol]: { notify } } },
    })
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(save).toHaveBeenCalledOnce()
    expect(notify).toHaveBeenCalledWith('Guardado')
  })

  it('slots con scope y v-model en un componente genérico', async () => {
    const wrapper = mount(SelectList<User>, {
      props: { items: users, modelValue: null, 'onUpdate:modelValue': (v: User | null) => wrapper.setProps({ modelValue: v }) },
      slots: { item: `<template #item="{ item, selected }">{{ item.name }}{{ selected ? ' ✓' : '' }}</template>` },
    })
    await wrapper.findAll('li')[1]!.trigger('click')
    expect(wrapper.props('modelValue')).toEqual(users[1])
    expect(wrapper.findAll('li').map((li) => li.text())).toEqual(['Ana', 'Beto ✓'])
  })

  it('findComponent y stubs: probar al padre sin el hijo real', () => {
    const wrapper = mount(UserPicker, { props: { users }, global: { stubs: { SelectList: true } } })
    const child = wrapper.findComponent(SelectList)
    expect(child.exists()).toBe(true)
    expect(child.props()).toMatchObject({ disabledIds: [3], size: 'sm' })
    expect(wrapper.html()).toContain('select-list-stub')
  })

  it('vi.mock de un módulo: el repo HTTP llama a http con la URL', async () => {
    vi.mocked(http).mockResolvedValue([])
    await createHttpRepository<User>('/api/users').list()
    expect(http).toHaveBeenCalledWith('/api/users')
  })

  it('withSetup: composable con lifecycle', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    const [online, app] = withSetup(useOnline)
    expect(online.value).toBe(true)

    onLine.mockReturnValue(false)
    window.dispatchEvent(new Event('offline'))
    expect(online.value).toBe(false)

    app.unmount()
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function))
    vi.restoreAllMocks()
  })
})
