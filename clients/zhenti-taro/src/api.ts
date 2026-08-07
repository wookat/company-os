import Taro from '@tarojs/taro'

// H5 dev 走同源代理（devServer proxy）；H5 生产/装壳（Capacitor）与小程序直连线上（后端已开 /api/* 白名单 CORS）
export const API_BASE =
  process.env.TARO_ENV === 'h5' && process.env.NODE_ENV === 'development' ? '' : 'https://zhenti.zalize.com'

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
  let res: Taro.request.SuccessCallbackResult<any>
  try {
    res = await doRequest(path, opts, token)
  } catch (e: any) {
    // 网络层失败（断网/超时）：统一中文提示，不透出 Failed to fetch 等原始异常
    throw new ApiError(0, '网络连接失败，请检查网络后重试')
  }
  if (res.statusCode === 401 && !path.startsWith('/api/login') && !path.startsWith('/api/register')) {
    logout()
    Taro.redirectTo({ url: '/pages/login/index' })
    throw new ApiError(401, '登录已过期，请重新登录')
  }
  if (res.statusCode >= 400) {
    throw new ApiError(res.statusCode, (res.data && (res.data.error || res.data.message)) || `请求失败（${res.statusCode}）`)
  }
  return res.data as T
}

function doRequest(path: string, opts: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; data?: any }, token: string) {
  return Taro.request({
    url: API_BASE + path,
    method: opts.method || 'GET',
    data: opts.data,
    header: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  })
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
  checkinPost: (src?: string) => request('/api/checkin', { method: 'POST', data: src ? { src } : undefined }),
  realYears: () => request<{ years: { year: number; n: number; paper_id: number | null; last_score: number | null; last_total: number | null }[] }>('/api/real/years'),
  realPaper: (year: number) => request<{ id: number; existed?: boolean }>(`/api/real/paper?year=${year}`),
  // 全真模考组卷/复用（客观题全量 + 5 道分析题，180 分钟）
  realMockPaper: (year: number) => request<{ id: number; existed?: boolean }>(`/api/real/mockpaper?year=${year}`),
  // 成绩页分析题逐要点自评（与 Web 端互通）
  essaySelf: (pid: number, question_id: number, hits: number[]) =>
    request(`/api/papers/${pid}/essay-self`, { method: 'POST', data: { question_id, hits } }),
  realRandPaper: () => request<{ id: number }>('/api/real/randpaper'),
  realWeak: (kps: string[]) => request<{ id: number }>(`/api/real/weak?kps=${encodeURIComponent(kps.join(','))}`),
  paper: (id: number) => request<{ paper: any; questions?: any[] }>(`/api/papers/${id}`),
  submit: (id: number, answers: Record<string, string>, duration_sec: number, retake = false, hesitated: number[] = []) =>
    request<any>(`/api/papers/${id}/submit`, { method: 'POST', data: { answers, duration_sec, retake, hesitated } }),
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
  subjMemoReview: (year: number, seq: number) => request('/api/subjmemo/review', { method: 'POST', data: { year, seq } }),
  // ---- 二期：Web 功能对齐 ----
  realDaily: () => request<{ q: any }>('/api/real/daily'),
  dailyReveal: () => request('/api/daily-reveal?src=app', { method: 'POST' }),
  wrongDueCount: () => request<{ due: number }>('/api/wrongdue'),
  remindGet: () => request<{ on: boolean }>('/api/remind'),
  remindSet: (on: boolean) => request('/api/remind', { method: 'POST', data: { on } }),
  redeem: (code: string) => request('/api/redeem', { method: 'POST', data: { code } }),
  realKps: () => request<{ kps: { kp_name: string; n: number; subject?: string }[] }>('/api/real/kps'),
  realKp: (name: string) => request<{ id: number; existed?: boolean }>(`/api/real/kp?name=${encodeURIComponent(name)}`),
  realBrowse: (year: number) => request<{ year: number; questions: any[] }>(`/api/real/browse?year=${year}`),
  realSearch: (q: string) => request<{ questions: any[]; subjective?: any[] }>(`/api/real/search?q=${encodeURIComponent(q)}`),
  realFavs: () => request<{ questions: any[] }>('/api/realfav'),
  realFavAdd: (id: number) => request('/api/realfav', { method: 'POST', data: { id } }),
  realFavDel: (id: number) => request(`/api/realfav/${id}`, { method: 'DELETE' }),
  realFavPaper: () => request<{ id: number; existed?: boolean }>('/api/real/favpaper'),
  // ---- 三期：Web R1-R16 对齐 ----
  shizhengStats: () => request<{ total: number; latest_ym: string | null; latest_count: number }>('/api/shizheng-stats'),
  realShizheng: () => request<{ id: number; existed?: boolean }>('/api/real/shizheng'),
  kpdrill: (name: string) => request<{ material_id: number; kp_id: number; imported?: string }>(`/api/kpdrill?name=${encodeURIComponent(name)}`),
  material: (id: number) => request<{ material: any; knowledge_points: { id: number; name: string; section?: string; selected?: number }[] }>(`/api/materials/${id}`),
  papersCreate: (material_id: number, count: number, kp_ids: number[], essay: boolean) =>
    request<{ id: number }>('/api/papers', { method: 'POST', data: { material_id, count, kp_ids, essay } }),
  // ---- 四期：竞品对标批次 A-D 对齐 ----
  flagQuestion: (id: number) => request(`/api/questions/${id}/flag`, { method: 'POST', data: { reason: '答案存疑' } }),
  // ---- 五期：Web 最近功能对齐 ----
  subjGrade: (year: number, seq: number, text: string) =>
    request<{ points: { i: number; hit: boolean; comment: string }[]; overall: string }>('/api/subjgrade', { method: 'POST', data: { year, seq, text } }),
  // ---- 七期：72 小时冲刺包 ----
  subjKps: () => request<{ kps: { kp_name: string; subject: string; year: number }[] }>('/api/real/subjective/kps')
}

// /api/me 缓存（会员/额度/邀请码），页面间共享
export type MeInfo = {
  id: number; email: string; invite_code?: string; invited_count?: number
  pro?: boolean; plan_expires_at?: string | null; pay_enabled?: boolean
  quota?: { paper_left: number; quick_left: number } | null
}
export async function fetchMe(): Promise<MeInfo | null> {
  try {
    const r: any = await request('/api/me')
    if (!r || !r.user) return null
    const u: MeInfo = {
      ...r.user,
      pro: !!r.pro,
      quota: r.quota || null,
      invite_code: r.invite_code,
      invited_count: r.invited_count,
      pay_enabled: !!r.pay_enabled
    }
    setUser(u)
    return u
  } catch { return null }
}

// 考研倒计时：与 app2（web/src/pages/Home.tsx）口径一致，固定考试日
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
  while (set.has(fmt(d))) { n++; d.setDate(d.getDate() - 1) }
  return n
}
