// Standalone: el equipo del remote lo levanta solo, sin el host.
import { mount } from './mfe'

mount(document.querySelector('#app')!, { user: 'modo standalone' })
