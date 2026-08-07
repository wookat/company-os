import { useSyncExternalStore, useEffect } from 'react'
import Taro from '@tarojs/taro'

// 深色模式三态（跟随系统/浅色/深色），storage key 与 Web 端一致：zt_theme
export type ThemeMode = 'auto' | 'light' | 'dark'

const KEY = 'zt_theme'
const listeners = new Set<() => void>()
let systemDark = false
let inited = false

export function getMode(): ThemeMode {
  try {
    const t = Taro.getStorageSync(KEY)
    return t === 'light' || t === 'dark' ? t : 'auto'
  } catch {
    return 'auto'
  }
}

export function isDark(): boolean {
  const m = getMode()
  return m === 'dark' || (m === 'auto' && systemDark)
}

function emit() {
  for (const fn of listeners) fn()
}

function applySideEffects() {
  const dark = isDark()
  if (process.env.TARO_ENV === 'h5') {
    document.documentElement.classList.toggle('theme-dark', dark)
    document.body.style.background = dark ? '#0F1420' : '#F4F6FA'
  } else {
    // 小程序：原生导航栏/窗口背景跟随主题
    Taro.setNavigationBarColor({
      frontColor: dark ? '#ffffff' : '#000000',
      backgroundColor: dark ? '#0F1420' : '#F5F7FB'
    }).catch(() => {})
    Taro.setBackgroundColor?.({
      backgroundColor: dark ? '#0F1420' : '#F5F7FB',
      backgroundColorTop: dark ? '#0F1420' : '#F5F7FB',
      backgroundColorBottom: dark ? '#0F1420' : '#F5F7FB'
    })?.catch?.(() => {})
  }
}

export function setMode(m: ThemeMode) {
  try {
    if (m === 'auto') Taro.removeStorageSync(KEY)
    else Taro.setStorageSync(KEY, m)
  } catch {}
  applySideEffects()
  emit()
}

// 跟随系统：H5 用 prefers-color-scheme，小程序用 getSystemInfo().theme + onThemeChange（需 app.config darkmode: true）
export function initTheme() {
  if (inited) return
  inited = true
  if (process.env.TARO_ENV === 'h5') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    systemDark = mq.matches
    const onChange = () => {
      systemDark = mq.matches
      if (getMode() === 'auto') {
        applySideEffects()
        emit()
      }
    }
    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else (mq as any).addListener(onChange)
  } else {
    try {
      systemDark = (Taro.getSystemInfoSync() as any).theme === 'dark'
    } catch {}
    Taro.onThemeChange?.(res => {
      systemDark = res.theme === 'dark'
      if (getMode() === 'auto') {
        applySideEffects()
        emit()
      }
    })
  }
  applySideEffects()
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** 当前主题设置（'auto'|'light'|'dark'） */
export function useThemeMode(): ThemeMode {
  return useSyncExternalStore(subscribe, getMode)
}

/** 页面根节点主题类：dark 时返回 'theme-dark'（小程序无法给 page 元素加类，逐页根节点挂载） */
export function usePageTheme(): string {
  const dark = useSyncExternalStore(subscribe, isDark)
  useEffect(() => {
    // 切页后小程序导航栏颜色需要按当前主题重刷
    if (process.env.TARO_ENV !== 'h5') applySideEffects()
  }, [dark])
  return dark ? 'theme-dark' : ''
}
