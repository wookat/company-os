import { Stack, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import React, { useEffect, useState } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import '../global.css'
import { loadSession, setUnauthorizedHandler } from '../lib/api'
import { ThemeProvider, usePalette, useTheme } from '../lib/theme'
import { ToastProvider } from '../components/Toast'

void SplashScreen.preventAutoHideAsync()

function RootStack() {
  const pal = usePalette()
  const { dark } = useTheme()
  const router = useRouter()

  useEffect(() => {
    setUnauthorizedHandler(() => router.replace('/login'))
    return () => setUnauthorizedHandler(null)
  }, [router])

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: pal.bg },
          animation: 'slide_from_right'
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="exam/[id]" options={{ gestureEnabled: false }} />
        <Stack.Screen name="result/[id]" />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void loadSession().finally(() => {
      setReady(true)
      void SplashScreen.hideAsync()
    })
  }, [])

  if (!ready) return null

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <ThemeProvider>
          <ToastProvider>
            <RootStack />
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
