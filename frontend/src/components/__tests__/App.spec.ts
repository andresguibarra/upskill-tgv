import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '../../App.vue'

describe('App', () => {
  it('muestra el título', () => {
    expect(mount(App).text()).toContain('Upskill TGV')
  })
})
