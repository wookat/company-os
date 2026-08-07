import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ScaleButton from '../components/ScaleButton'
import { useToast } from '../components/Toast'
import { ApiError, api, setSession } from '../lib/api'
import { hapticSuccess } from '../lib/haptics'
import { usePalette } from '../lib/theme'

export default function Login() {
  const router = useRouter()
  const { toast } = useToast()
  const pal = usePalette()
  const insets = useSafeAreaInsets()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const em = email.trim()
    if (!em || !/^\S+@\S+\.\S+$/.test(em)) return toast('请输入有效邮箱')
    if (password.length < 6) return toast('密码至少 6 位')
    setBusy(true)
    try {
      const r =
        mode === 'login' ? await api.login(em, password) : await api.register(em, password)
      await setSession(r.token, r.user)
      hapticSuccess()
      router.replace('/(tabs)')
    } catch (e) {
      toast(e instanceof ApiError ? e.message : '操作失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bgl dark:bg-bgd"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 64, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInUp.duration(400)} className="px-8">
          <View className="mb-2 h-16 w-16 items-center justify-center rounded-3xl bg-brand dark:bg-brand-dark">
            <Text className="text-3xl font-bold text-white">真</Text>
          </View>
          <Text className="mt-4 text-3xl font-bold text-gray-900 dark:text-gray-100">真题工坊</Text>
          <Text className="mt-2 text-base text-gray-500 dark:text-gray-400">
            考研政治历年真题 · 智能刷题与复盘
          </Text>

          <View className="mt-10 flex-row rounded-2xl bg-gray-200/70 p-1 dark:bg-cardd">
            {(['login', 'register'] as const).map(m => (
              <ScaleButton
                key={m}
                haptic={false}
                className={`min-h-[44px] flex-1 items-center justify-center rounded-xl ${
                  mode === m ? 'bg-white dark:bg-brand-dark/20' : ''
                }`}
                onPress={() => setMode(m)}
              >
                <Text
                  className={`text-base font-medium ${
                    mode === m
                      ? 'text-brand dark:text-brand-dark'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {m === 'login' ? '登录' : '注册'}
                </Text>
              </ScaleButton>
            ))}
          </View>

          <View className="mt-6 gap-4">
            <TextInput
              className="min-h-[52px] rounded-2xl bg-white px-5 text-base text-gray-900 dark:bg-cardd dark:text-gray-100"
              placeholder="邮箱"
              placeholderTextColor={pal.text3}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              className="min-h-[52px] rounded-2xl bg-white px-5 text-base text-gray-900 dark:bg-cardd dark:text-gray-100"
              placeholder="密码（至少 6 位）"
              placeholderTextColor={pal.text3}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <ScaleButton
            className="mt-8 min-h-[52px] items-center justify-center rounded-2xl bg-brand dark:bg-brand-dark"
            onPress={() => void submit()}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-lg font-semibold text-white">
                {mode === 'login' ? '登录' : '注册并开始刷题'}
              </Text>
            )}
          </ScaleButton>

          <Text className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
            注册即代表同意用户协议与隐私政策
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
