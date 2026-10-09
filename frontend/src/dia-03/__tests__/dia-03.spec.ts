import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useAsync } from '../useAsync'
import { createNotifier, useNotifier } from '../notifier'

describe('día 3: mixins, plugins y provide/inject', () => {
  it('useAsync expone data, loading y error', async () => {
    const ok = useAsync(async () => 42)
    const pending = ok.run()
    expect(ok.loading.value).toBe(true)
    await pending
    expect(ok.data.value).toBe(42)
    expect(ok.loading.value).toBe(false)

    const ko = useAsync(() => Promise.reject(new Error('boom')))
    await ko.run()
    expect(ko.error.value?.message).toBe('boom')
  })

  it('el plugin provee el notifier por inject y por $notify', () => {
    const notify = vi.fn<(message: string) => void>()
    const Child = defineComponent({
      setup() {
        useNotifier().notify('desde inject')
        return () => h('span')
      },
      mounted() {
        this.$notify('desde globalProperties')
      },
    })
    mount(Child, { global: { plugins: [createNotifier(notify)] } })
    expect(notify.mock.calls).toEqual([['desde inject'], ['desde globalProperties']])
  })

  it('useNotifier falla claro si no se instaló el plugin', () => {
    const Child = defineComponent({ setup: () => (useNotifier(), () => null) })
    expect(() => mount(Child)).toThrow('Falta instalar el plugin')
  })
})
