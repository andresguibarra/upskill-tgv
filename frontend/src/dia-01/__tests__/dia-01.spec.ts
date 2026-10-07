import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import OptionsCounter from '../OptionsCounter.vue'
import SetupCounter from '../SetupCounter.vue'
import SearchBox from '../SearchBox.vue'
import { useCounter } from '../useCounter'

describe('día 1: Vue 2 → Vue 3', () => {
  it('useCounter se puede testear sin montar nada', () => {
    const { count, double, inc } = useCounter(2)
    inc()
    expect(count.value).toBe(3)
    expect(double.value).toBe(6)
  })

  it.each([OptionsCounter, SetupCounter])('ambas versiones se comportan igual', async (Counter) => {
    const wrapper = mount(Counter, { props: { start: 1 } })
    await wrapper.get('button').trigger('click')
    expect(wrapper.text()).toBe('2 (x2 = 4)')
    expect(wrapper.emitted('change')).toEqual([[2]])
  })

  it('defineModel emite update:modelValue', async () => {
    const wrapper = mount(SearchBox, { props: { modelValue: '' } })
    await wrapper.get('input').setValue('vue')
    await nextTick()
    expect(wrapper.emitted('update:modelValue')).toEqual([['vue']])
  })
})
