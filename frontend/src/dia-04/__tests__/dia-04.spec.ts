import { describe as suite, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SelectList from '../SelectList.vue'
import UserPicker from '../UserPicker.vue'
import { describe, type User } from '../types'

const users: User[] = [
  { id: 1, name: 'Ana', email: 'ana@x.com', role: 'admin' },
  { id: 2, name: 'Beto', email: 'beto@x.com', role: 'editor' },
  { id: 3, name: 'Caro', email: 'caro@x.com', role: 'viewer' },
]

suite('día 4: TS avanzado', () => {
  it('la unión discriminada se angosta por status', () => {
    expect(describe<User>({ status: 'ok', data: users })).toBe('3 resultados')
    expect(describe<User>({ status: 'error', error: '500' })).toBe('Error: 500')
    expect(describe<User>({ status: 'loading' })).toBe('loading')
  })

  it('SelectList genérico emite el item y actualiza v-model', async () => {
    const wrapper = mount(SelectList<User>, { props: { items: users } })
    await wrapper.findAll('li')[1]!.trigger('click')
    expect(wrapper.emitted('select')).toEqual([[users[1]]])
    expect(wrapper.emitted('update:modelValue')).toEqual([[users[1]]])
  })

  it('ignora los ids deshabilitados', async () => {
    const wrapper = mount(SelectList<User>, { props: { items: users, disabledIds: [3] } })
    await wrapper.findAll('li')[2]!.trigger('click')
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('UserPicker usa el slot tipado y defineExpose', async () => {
    const wrapper = mount(UserPicker, { props: { users } })
    expect(wrapper.text()).toContain('Beto (editor)')
    await wrapper.findAll('li')[0]!.trigger('click')
    expect(wrapper.find('strong').text()).toBe('Ana')
    await wrapper.get('button').trigger('click')
    expect(wrapper.find('strong').exists()).toBe(false)
  })
})
