// Comunicación entre microfrontends sin acoplarlos: CustomEvent sobre window, tipado con un mapa.
export interface MfeEvents {
  'cart:add': { sku: string; qty: number }
  'auth:logout': undefined
}

export function emit<K extends keyof MfeEvents>(type: K, detail: MfeEvents[K]) {
  window.dispatchEvent(new CustomEvent(type, { detail }))
}

export function on<K extends keyof MfeEvents>(type: K, handler: (detail: MfeEvents[K]) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<MfeEvents[K]>).detail)
  window.addEventListener(type, listener)
  return () => window.removeEventListener(type, listener) // devolver el "off" evita fugas
}
