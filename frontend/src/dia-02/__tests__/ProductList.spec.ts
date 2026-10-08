import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ProductList from '../ProductList.vue'
import { formatCurrency } from '../formatCurrency'
import type { Product } from '../types'

const products: Product[] = [
  { id: 1, name: 'Teclado', price: 100 },
  { id: 2, name: 'Mouse', price: 50 },
  { id: 3, name: 'Monitor', price: 300 },
]

const mountList = (search = '') => mount(ProductList, { props: { products, search } })

describe('día 2: ProductList migrado', () => {
  it('filtra por nombre sin importar mayúsculas y recalcula el total', () => {
    const wrapper = mountList('mo')
    expect(wrapper.findAll('li').map((li) => li.text())).toEqual([
      `Mouse: ${formatCurrency(50)}`,
      `Monitor: ${formatCurrency(300)}`,
    ])
    expect(wrapper.text()).toContain(`Total: ${formatCurrency(350)}`)
  })

  it('muestra "Sin resultados" si nada coincide', () => {
    expect(mountList('zzz').text()).toContain('Sin resultados')
  })

  it('v-model:search emite update:search al escribir', async () => {
    const wrapper = mountList()
    await wrapper.get('input').setValue('tec')
    expect(wrapper.emitted('update:search')).toEqual([['tec']])
  })

  it('al hacer click emite select y marca el elemento', async () => {
    const wrapper = mountList()
    await wrapper.findAll('li')[1]!.trigger('click')
    expect(wrapper.emitted('select')).toEqual([[products[1]]])
    expect(wrapper.findAll('li')[1]!.classes()).toContain('selected')
  })
})
