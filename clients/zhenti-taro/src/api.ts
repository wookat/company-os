import Taro from '@tarojs/taro'

// H5 走同源代理（devServer proxy → zhenti.zalize.com），小程序直连线上
export const API_BASE = process.env.TARO_ENV === 'h5' ? '' : 'https://zhenti.zalize.com'

const TOKEN_KEY = 'zt_token'
const USER_KEY = 'zt_user'

export function getToken(): string {
  try { return Taro.getStorageSync(TOKEN_KEY) || '' } catch { return '' }
}
export function setToken(t: string) { Taro.setStorageSync(TOKEN_KEY, t) }
export function getUser(): { id: number; email: string; plan: string } | null {
  try { return Taro.getStorageSync(USER_KEY) || null } catch { return null }
}
export function setUser(u: any) { Taro.setStorageSync(USER_KEY, u) }
export function logout() {
  Taro.removeStorageSync(TOKEN_KEY)
  Taro.removeStorageSync(USER_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function request<T = any>(path: string, opts: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; data?: any } = {}): Promise<T> {
  const token = getToken()
  const res = await Taro.request({
    url: API_BASE + path,
    method: opts.method || 'GET',
    data: opts.data,
    header: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  })
  if (res.statusCode === 401 && !path.startsWith('/api/login') && !path.startsWith('/api/register')) {
    logout()
    Taro.redirectTo({ url: '/pages/login/index' })
    throw new ApiError(401, '登录已过期，请重新登录')
  }
  if (res.statusCode >= 400) {
    throw new ApiError(res.statusCode, (res.data && res.data.error) || `请求失败（${res.statusCode}）`)
  }
  return res.data as T
}

export function requireLogin(): boolean {
  if (!getToken()) {
    Taro.redirectTo({ url: '/pages/login/index' })
    return false
  }
  return true
}

export function toast(title: string, icon: 'none' | 'success' | 'error' = 'none') {
  Taro.showToast({ title, icon, duration: 2000 })
}

// ---- 业务 API ----
export const api = {
  register: (email: string, password: string) => request<{ token: string; user: any }>('/api/register', { method: 'POST', data: { email, password } }),
  login: (email: string, password: string) => request<{ token: string; user: any }>('/api/login', { method: 'POST', data: { email, password } }),
  me: () => request<{ user: any }>('/api/me'),
  stats: () => request<any>('/api/stats'),
  kpstats: () => request<{ kps: { kp: string; total: number; correct: number }[] }>('/api/kpstats'),
  checkin: () => request<{ days: string[] }>('/api/checkin'),
  checkinPost: () => request('/api/checkin', { method: 'POST' }),
  realYears: () => request<{ years: { year: number; n: number; paper_id: number | null; last_score: number | null; last_total: number | null }[] }>('/api/real/years'),
  realPaper: (year: number) => request<{ id: number; existed?: boolean }>(`/api/real/paper?year=${year}`),
  realRandPaper: () => request<{ id: number }>('/api/real/randpaper'),
  realWeak: (kps: string[]) => request<{ id: number }>(`/api/real/weak?kps=${encodeURIComponent(kps.join(','))}`),
  paper: (id: number) => request<{ paper: any; questions?: any[] }>(`/api/papers/${id}`),
  submit: (id: number, answers: Record<string, string>, duration_sec: number, retake = false) =>
    request<any>(`/api/papers/${id}/submit`, { method: 'POST', data: { answers, duration_sec, retake } }),
  result: (id: number) => request<any>(`/api/papers/${id}/result`),
  history: () => request<{ attempts: any[] }>('/api/history'),
  wrongbook: () => request<{ questions: any[] }>('/api/wrongbook'),
  wrongReview: (qid: number, correct: boolean) => request<any>(`/api/wrongbook/${qid}/review`, { method: 'POST', data: { correct } }),
  wrongDelete: (qid: number) => request(`/api/wrongbook/${qid}`, { method: 'DELETE' }),
  favorites: () => request<{ questions: any[] }>('/api/favorites'),
  favAdd: (question_id: number) => request('/api/favorites', { method: 'POST', data: { question_id } }),
  favDel: (question_id: number) => request(`/api/favorites/${question_id}`, { method: 'DELETE' }),
  subjYears: () => request<{ years: { year: number; n: number }[] }>('/api/real/subjective/years'),
  subjective: (year: number) => request<{ year: number; questions: any[] }>(`/api/real/subjective?year=${year}`),
  subjMemo: () => request<{ keys: string[]; today_n: number; due: string[]; hits: Record<string, any> }>('/api/subjmemo'),
  subjMemoSet: (year: number, seq: number, on: boolean) => request('/api/subjmemo', { method: 'POST', data: { year, seq, on } }),
  subjMemoHit: (year: number, seq: number, n: number, t: number, sel: number[]) =>
    request('/api/subjmemo/hit', { method: 'POST', data: { year, seq, n, t, sel } }),
  subjMemoReview: (year: number, seq: number) => request('/api/subjmemo/review', { method: 'POST', data: { year, seq } })
}

// 下一次考研初试（12 月倒数第二个周六）：返回 { year: 届别, days: 剩余天数 }
export function nextExam(): { year: number; days: number } {
  const now = Date.now()
  for (let y = new Date().getFullYear(); ; y++) {
    const d = new Date(Date.UTC(y, 11, 31))
    let sat = 0
    for (let day = 31; day >= 1; day--) {
      d.setUTCDate(day)
      if (d.getUTCDay() === 6 && ++sat === 2) break
    }
    const t = d.getTime() - 8 * 3600000 // 北京时间当天 0 点
    if (t >= now) return { year: y + 1, days: Math.ceil((t - now) / 86400000) }
  }
}

// 连续打卡天数（days: ['2026-08-04', ...] 倒序）
export function streakDays(days: string[]): number {
  if (!days.length) return 0
  const set = new Set(days)
  const d = new Date()
  let n = 0
  const fmt = (x: Date) => x.toISOString().slice(0, 10)
  if (!set.has(fmt(d))) d.setDate(d.getDate() - 1)
  while (set.has(fmt(d))) { n++; d.setDate(d.getDate() - 1) }
  return n
}
