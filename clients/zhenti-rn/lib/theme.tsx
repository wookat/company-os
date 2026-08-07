import AsyncStorage from '@react-native-async-storage/async-storage'
import { colorScheme as nwColorScheme, useColorScheme as useNwColorScheme } from 'nativewind'
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type ThemeMode = 'system' | 'light' | 'dark'

const MODE_KEY = 'zt_theme_mode'
const BIGFONT_KEY = 'zt_bigfont'

type ThemeCtx = {
  mode: ThemeMode
  setMode: (m: ThemeMode) => void
  dark: boolean
  bigFont: boolean
  setBigFont: (v: boolean) => void
}

const Ctx = createContext<ThemeCtx>({
  mode: 'system',
  setMode: () => undefined,
  dark: false,
  bigFont: false,
  setBigFont: () => undefined
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system')
  const [bigFont, setBigFontState] = useState(false)
  const { colorScheme } = useNwColorScheme()

  useEffect(() => {
    void (async () => {
      const m = (await AsyncStorage.getItem(MODE_KEY)) as ThemeMode | null
      if (m === 'light' || m === 'dark' || m === 'system') {
        setModeState(m)
        nwColorScheme.set(m)
      }
      const bf = await AsyncStorage.getItem(BIGFONT_KEY)
      setBigFontState(bf === '1')
    })()
  }, [])

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m)
    nwColorScheme.set(m)
    void AsyncStorage.setItem(MODE_KEY, m)
  }, [])

  const setBigFont = useCallback((v: boolean) => {
    setBigFontState(v)
    void AsyncStorage.setItem(BIGFONT_KEY, v ? '1' : '0')
  }, [])

  const dark = colorScheme === 'dark'
  const value = useMemo(
    () => ({ mode, setMode, dark, bigFont, setBigFont }),
    [mode, setMode, dark, bigFont, setBigFont]
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTheme(): ThemeCtx {
  return useContext(Ctx)
}

// 主题色 token（供无法用 className 的场合，如导航器配置）
export const palette = {
  light: {
    brand: '#3D7FFF',
    bg: '#F4F6FA',
    card: '#FFFFFF',
    text: '#111827',
    text2: '#4B5563',
    text3: '#9CA3AF',
    border: '#E5E7EB',
    ok: '#00B578',
    warn: '#F59E0B',
    rose: '#F43F5E'
  },
  dark: {
    brand: '#649AFF',
    bg: '#0F1420',
    card: '#1A2130',
    text: '#F3F4F6',
    text2: '#B4BBC8',
    text3: '#6B7280',
    border: '#2A3244',
    ok: '#34D399',
    warn: '#FBBF24',
    rose: '#FB7185'
  }
} as const

export function usePalette() {
  const { dark } = useTheme()
  return dark ? palette.dark : palette.light
}
