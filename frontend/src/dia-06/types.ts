import type { Entity } from '../dia-04/types'

export type { Entity }

export interface Todo extends Entity {
  title: string
  done: boolean
}

// Lo que manda el alta (sin id) y lo que manda la edición (parcial).
export type Draft<T extends Entity> = Omit<T, 'id'>
export type Patch<T extends Entity> = Partial<Draft<T>>

// Contrato del CRUD: la UI no sabe si atrás hay memoria o HTTP.
export interface Repository<T extends Entity> {
  list(): Promise<T[]>
  create(draft: Draft<T>): Promise<T>
  update(id: T['id'], patch: Patch<T>): Promise<T>
  remove(id: T['id']): Promise<void>
}
