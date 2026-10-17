// Cliente HTTP mínimo y tipado sobre fetch.
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) throw new ApiError(res.status, `${res.status} ${res.statusText}`)
  return (await res.json()) as T
}

export const api = {
  get: <T>(url: string, signal?: AbortSignal) => http<T>(url, { signal }),
  post: <T, B>(url: string, body: B) => http<T>(url, { method: 'POST', body: JSON.stringify(body) }),
}
