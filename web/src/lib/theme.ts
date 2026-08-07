import { useSyncExternalStore } from 'react'

export type Theme = 'auto' | 'light' | 'dark'

const KEY = 'zt_theme'
const listeners = new Set<() => void>()
const mq = window.matchMedia('(prefers-color-scheme: dark)')

export function getTheme(): Theme {
  const t = localStorage.getItem(KEY)
  return t === 'light' || t === 'dark' ? t : 'auto'
}

function isDark(t: Theme): boolean {
  return t === 'dark' || (t === 'auto' && mq.matches)
}

function apply() {
  const dark = isDark(getTheme())
  document.documentElement.classList.toggle('dark', dark)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? '#0F1420' : '#3D7FFF')
}

function emit() {
  for (const fn of listeners) fn()
}

export function setTheme(t: Theme) {
  if (t === 'auto') localStorage.removeItem(KEY)
  else localStorage.setItem(KEY, t)
  apply()
  emit()
}

export function initTheme() {
  apply()
  mq.addEventListener('change', () => {
    if (getTheme() === 'auto') {
      apply()
      emit()
    }
  })
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** 当前主题设置（'auto'|'light'|'dark'） */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme)
}

/** 当前是否实际处于深色模式 */
export function useIsDark(): boolean {
  return useSyncExternalStore(subscribe, () => isDark(getTheme()))
}
