export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export function getToken(): string {
  return localStorage.getItem('zt_token') || ''
}
export function setToken(t: string) {
  if (t) localStorage.setItem('zt_token', t)
  else localStorage.removeItem('zt_token')
}

export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((opts.headers as Record<string, string>) || {}),
  }
  const token = getToken()
  if (token) headers['Authorization'] = 'Bearer ' + token
  const r = await fetch('/api' + path, { ...opts, headers })
  const data = await r.json().catch(() => ({ error: '网络错误' }))
  if (!r.ok) throw new ApiError((data as { error?: string }).error || 'HTTP ' + r.status, r.status)
  return data as T
}
