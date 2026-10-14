export interface Entity {
  id: number
}

export interface User extends Entity {
  name: string
  email: string
  role: 'admin' | 'editor' | 'viewer'
}

// Utility types: el formulario de alta no tiene id; el de edición es parcial.
export type UserDraft = Omit<User, 'id'>
export type UserPatch = Partial<UserDraft> & Pick<User, 'id'>

// Unión discriminada: TS sabe qué campos existen según `status`.
export type LoadState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string }

export function describe<T>(state: LoadState<T[]>): string {
  switch (state.status) {
    case 'ok':
      return `${state.data.length} resultados`
    case 'error':
      return `Error: ${state.error}`
    default:
      return state.status
  }
}
