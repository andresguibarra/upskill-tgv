// Tipos del contrato que expone el remote (en un proyecto real, un paquete compartido).
declare module 'catalog/mfe' {
  export function mount(el: Element, props: { user: string }): void
  export function unmount(): void
}
