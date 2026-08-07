import * as SecureStore from 'expo-secure-store'

export const API_BASE = 'https://zhenti.zalize.com'

const TOKEN_KEY = 'zt_token'
const USER_KEY = 'zt_user'

let tokenCache: string | null = null
let userCache: User | null = null

export type User = { id: number; email: string; plan?: string }

export async function loadSession(): Promise<{ token: string; user: User | null }> {
  if (tokenCache === null) {
    tokenCache = (await SecureStore.getItemAsync(TOKEN_KEY)) ?? ''
    const raw = await SecureStore.getItemAsync(USER_KEY)
    userCache = raw ? (JSON.parse(raw) as User) : null
  }
  return { token: tokenCache, user: userCache }
}

export function getToken(): string {
  return tokenCache ?? ''
}

export function getUser(): User | null {
  return userCache
}

export async function setSession(token: string, user: User): Promise<void> {
  tokenCache = token
  userCache = user
  await SecureStore.setItemAsync(TOKEN_KEY, token)
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user))
}

export async function clearSession(): Promise<void> {
  tokenCache = ''
  userCache = null
  await SecureStore.deleteItemAsync(TOKEN_KEY)
  await SecureStore.deleteItemAsync(USER_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type UnauthorizedHandler = () => void
let onUnauthorized: UnauthorizedHandler | null = null
export function setUnauthorizedHandler(fn: UnauthorizedHandler | null): void {
  onUnauthorized = fn
}

export async function request<T>(
  path: string,
  opts: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; data?: unknown } = {}
): Promise<T> {
  const token = getToken()
  let res: Response
  try {
    res = await fetch(API_BASE + path, {
      method: opts.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: opts.data !== undefined ? JSON.stringify(opts.data) : undefined
    })
  } catch {
    throw new ApiError(0, '网络连接失败，请检查网络后重试')
  }
  if (res.status === 401 && !path.startsWith('/api/login') && !path.startsWith('/api/register')) {
    await clearSession()
    onUnauthorized?.()
    throw new ApiError(401, '登录已过期，请重新登录')
  }
  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    body = null
  }
  if (res.status >= 400) {
    const b = body as { error?: string; message?: string } | null
    throw new ApiError(res.status, b?.error || b?.message || `请求失败（${res.status}）`)
  }
  return body as T
}

// ---- 数据类型 ----
export type YearRow = {
  year: number
  n: number
  paper_id: number | null
  last_score: number | null
  last_total: number | null
}

export type Question = {
  id: number
  seq: number
  stem: string
  opt_a: string
  opt_b: string
  opt_c: string
  opt_d: string
  knowledge_point: string
  qtype: string
}

export type Paper = {
  id: number
  title?: string
  status?: string
  fail_reason?: string
  generated_count?: number
}

export type ResultDetail = {
  id: number
  seq: number
  your: string
  answer: string
  correct: boolean | null
  analysis: string
  knowledge_point: string
  qtype: string
  stem: string
  opt_a: string
  opt_b: string
  opt_c: string
  opt_d: string
}

export type PaperResult = {
  title?: string
  score: number
  total: number
  duration_sec?: number
  beat_pct?: number
  attempt_count?: number
  detail: ResultDetail[]
}

export type WrongQuestion = {
  id: number
  stem: string
  opt_a: string
  opt_b: string
  opt_c: string
  opt_d: string
  answer: string
  analysis: string
  knowledge_point: string
  qtype: string
  your_answer: string
  box: number
  due: number
  due_at: string | null
  subject: string
}

export type Stats = {
  wrong_due?: number
  attempts?: { created_at: string }[]
  attempt_day_ts?: string[]
}

export type MeInfo = {
  id: number
  email: string
  invite_code?: string
  invited_count?: number
  pro?: boolean
  plan_expires_at?: string | null
  quota?: { paper_left: number; quick_left: number } | null
}

// ---- 业务 API ----
export const api = {
  register: (email: string, password: string) =>
    request<{ token: string; user: User }>('/api/register', { method: 'POST', data: { email, password } }),
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/api/login', { method: 'POST', data: { email, password } }),
  me: () => request<{ user: User; pro?: boolean; quota?: MeInfo['quota'] }>('/api/me'),
  stats: () => request<Stats>('/api/stats'),
  kpstats: () => request<{ kps: { kp: string; total: number; correct: number }[] }>('/api/kpstats'),
  checkin: () => request<{ days: string[] }>('/api/checkin'),
  checkinPost: (src?: string) =>
    request<unknown>('/api/checkin', { method: 'POST', data: src ? { src } : undefined }),
  realYears: () => request<{ years: YearRow[] }>('/api/real/years'),
  realPaper: (year: number) => request<{ id: number; existed?: boolean }>(`/api/real/paper?year=${year}`),
  realRandPaper: () => request<{ id: number }>('/api/real/randpaper'),
  realWeak: (kps: string[]) =>
    request<{ id: number }>(`/api/real/weak?kps=${encodeURIComponent(kps.join(','))}`),
  realKps: () => request<{ kps: { kp_name: string; n: number; subject?: string }[] }>('/api/real/kps'),
  realKp: (name: string) =>
    request<{ id: number; existed?: boolean }>(`/api/real/kp?name=${encodeURIComponent(name)}`),
  paper: (id: number) => request<{ paper: Paper; questions?: Question[] }>(`/api/papers/${id}`),
  submit: (id: number, answers: Record<string, string>, duration_sec: number, retake = false) =>
    request<{ score: number; total: number }>(`/api/papers/${id}/submit`, {
      method: 'POST',
      data: { answers, duration_sec, retake, hesitated: [] }
    }),
  result: (id: number) => request<PaperResult>(`/api/papers/${id}/result`),
  history: () => request<{ attempts: unknown[] }>('/api/history'),
  wrongbook: () => request<{ questions: WrongQuestion[] }>('/api/wrongbook'),
  wrongReview: (qid: number, correct: boolean) =>
    request<{ graduated?: boolean; next_days?: number }>(`/api/wrongbook/${qid}/review`, {
      method: 'POST',
      data: { correct }
    }),
  wrongDelete: (qid: number) => request<unknown>(`/api/wrongbook/${qid}`, { method: 'DELETE' }),
  wrongDueCount: () => request<{ due: number }>('/api/wrongdue')
}

// 考研倒计时：固定考试日（与 Web 端口径一致）
const EXAM_DATE = new Date('2026-12-19T00:00:00+08:00')
export function nextExam(): { year: number; days: number } {
  return { year: 2027, days: Math.max(0, Math.ceil((EXAM_DATE.getTime() - Date.now()) / 86400000)) }
}

// 连续打卡天数（days: ['2026-08-04', ...] 倒序）
export function streakDays(days: string[]): number {
  if (!days.length) return 0
  const set = new Set(days)
  const d = new Date()
  let n = 0
  const fmt = (x: Date) => x.toISOString().slice(0, 10)
  if (!set.has(fmt(d))) d.setDate(d.getDate() - 1)
  while (set.has(fmt(d))) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}
