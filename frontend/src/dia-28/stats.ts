import { http } from '../dia-05/http'

// Espejo de `TodoStats` en backend/Upskill.Api/Todos/Todo.cs. System.Text.Json serializa en camelCase.
export interface TodoStats {
  total: number
  done: number
  pending: number
}

export const fetchStats = (signal?: AbortSignal) => http<TodoStats>('/api/todos/stats', { signal })
