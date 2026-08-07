export interface Me {
  id: number
  email: string
  invite_code?: string
  invited_count?: number
  pro?: boolean
  plan_expires_at?: string | null
  pay_enabled?: boolean
  quota?: { paper_left: number; quick_left: number } | null
}

export interface Question {
  id: number
  seq?: number
  stem: string
  opt_a: string
  opt_b: string
  opt_c: string
  opt_d: string
  answer: string
  analysis?: string
  qtype?: string
  knowledge_point?: string
  kp_name?: string
  subject?: string
  year?: number
  answer_disputed?: number
}

export interface WrongQ extends Question {
  your_answer?: string
  due?: boolean
  due_at?: string | null
  box?: number
  created_at?: string
}

export interface Attempt {
  paper_id: number
  title?: string
  subject?: string
  score: number
  total: number
  answered?: number
  duration_sec?: number
  created_at?: string
}

export interface Stats {
  attempts?: Attempt[]
  attempt_day_ts?: string[]
  wrong_count?: number
  wrong_due?: number
  kp_total?: number
  kp_covered?: number
}

export interface ResultDetail {
  id: number
  seq: number
  stem: string
  qtype?: string
  your?: string
  answer: string
  correct?: boolean
  analysis?: string
  knowledge_point: string
  self?: number[]
}

export interface PaperResult {
  score: number
  total: number
  duration_sec?: number
  title?: string
  beat_pct?: number
  detail: ResultDetail[]
  history?: { score: number; total: number }[]
  attempt_count?: number | null
}

export interface SubjQuestion {
  seq: number
  stem: string
  questions: string[]
  answer_points: string[]
  subject?: string
  kp_name?: string
}
