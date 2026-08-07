import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { Text, View } from 'react-native'
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated'

type ToastCtx = { toast: (msg: string) => void }

const Ctx = createContext<ToastCtx>({ toast: () => undefined })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const toast = useCallback((m: string) => {
    setMsg(m)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(null), 2200)
  }, [])

  const value = useMemo(() => ({ toast }), [toast])
  return (
    <Ctx.Provider value={value}>
      <View className="flex-1">
        {children}
        {msg != null && (
          <Animated.View
            entering={FadeInDown.duration(180)}
            exiting={FadeOutDown.duration(180)}
            pointerEvents="none"
            className="absolute bottom-24 left-8 right-8 items-center"
          >
            <View className="max-w-full rounded-2xl bg-black/80 px-5 py-3 dark:bg-white/90">
              <Text className="text-center text-sm text-white dark:text-gray-900">{msg}</Text>
            </View>
          </Animated.View>
        )}
      </View>
    </Ctx.Provider>
  )
}

export function useToast(): ToastCtx {
  return useContext(Ctx)
}
