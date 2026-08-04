import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmtDur(sec?: number | null): string {
  if (!sec && sec !== 0) return '--'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m ? `${m} 分 ${s} 秒` : `${s} 秒`
}

export function fmtDate(s?: string | null): string {
  if (!s) return ''
  const d = new Date(s.replace(' ', 'T') + (s.includes('Z') || s.includes('+') ? '' : 'Z'))
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString('zh-CN')
}

export function localDay(s: string): string {
  const d = new Date(s.replace(' ', 'T') + (s.includes('Z') || s.includes('+') ? '' : 'Z'))
  return d.toLocaleDateString('zh-CN')
}

export function todayStr(): string {
  return new Date().toLocaleDateString('zh-CN')
}

const SUBJ_COLORS: Record<string, string> = {
  历年真题: '#F43F5E',
  '马原·哲学': '#3D7FFF',
  毛中特: '#FF7A2F',
  史纲: '#8B5CF6',
  思修法基: '#00B578',
  形势与政策: '#0EA5E9',
}
export function subjColor(s?: string | null): string {
  if (!s) return '#9AA3B2'
  if (SUBJ_COLORS[s]) return SUBJ_COLORS[s]
  for (const k in SUBJ_COLORS) if (s.includes(k)) return SUBJ_COLORS[k]
  const palette = ['#3D7FFF', '#FF7A2F', '#8B5CF6', '#00B578', '#0EA5E9', '#F43F5E']
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return palette[h % palette.length]
}
export function subjTextColor(s?: string | null): string {
  return s && s.startsWith('历年真题') ? '#E11D48' : subjColor(s)
}
