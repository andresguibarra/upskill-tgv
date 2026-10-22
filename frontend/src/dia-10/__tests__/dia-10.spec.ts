import { afterEach, describe, it, expect, vi } from 'vitest'
import { defineMicroFrontend } from '../contract'
import { emit, on } from '../events'
import GreetingRemote from '../GreetingRemote.vue'

afterEach(() => (document.body.innerHTML = ''))

describe('día 10: microfrontends', () => {
  it('el host monta y desmonta el microfrontend por contrato', () => {
    const el = document.createElement('div')
    document.body.append(el)
    const mfe = defineMicroFrontend<{ user: string }>(GreetingRemote)

    mfe.mount(el, { user: 'Andres' })
    expect(el.textContent).toContain('Hola, Andres')
    mfe.unmount()
    expect(el.innerHTML).toBe('')
  })

  it('los eventos cruzan de un microfrontend a otro y el off corta la escucha', () => {
    const el = document.createElement('div')
    const mfe = defineMicroFrontend<{ user: string }>(GreetingRemote)
    mfe.mount(el, { user: 'Andres' })
    const handler = vi.fn<(d: { sku: string; qty: number }) => void>()
    const off = on('cart:add', handler)

    el.querySelector('button')!.click()
    expect(handler).toHaveBeenLastCalledWith({ sku: 'ABC-1', qty: 1 })

    off()
    emit('cart:add', { sku: 'X', qty: 2 })
    expect(handler).toHaveBeenCalledOnce()
    mfe.unmount()
  })
})
