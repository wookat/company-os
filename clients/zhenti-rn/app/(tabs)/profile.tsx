import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import { Alert, ScrollView, Switch, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ScaleButton from '../../components/ScaleButton'
import { useToast } from '../../components/Toast'
import { MeInfo, api, clearSession, getToken, getUser } from '../../lib/api'
import { ThemeMode, usePalette, useTheme } from '../../lib/theme'

const MODES: { key: ThemeMode; label: string; icon: string }[] = [
  { key: 'light', label: '浅色', icon: '☀️' },
  { key: 'dark', label: '深色', icon: '🌙' },
  { key: 'system', label: '跟随系统', icon: '⚙️' }
]

export default function Profile() {
  const router = useRouter()
  const { toast } = useToast()
  const insets = useSafeAreaInsets()
  const pal = usePalette()
  const { mode, setMode, bigFont, setBigFont } = useTheme()
  const [me, setMe] = useState<MeInfo | null>(null)

  useFocusEffect(
    useCallback(() => {
      if (!getToken()) {
        router.replace('/login')
        return
      }
      api.me()
        .then(r => setMe({ ...r.user, pro: !!r.pro, quota: r.quota ?? null }))
        .catch(() => undefined)
    }, [router])
  )

  const email = me?.email ?? getUser()?.email ?? ''

  const doLogout = () => {
    Alert.alert('退出登录？', '本地作答草稿会保留，账号数据在云端不受影响。', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出',
        style: 'destructive',
        onPress: () => {
          void clearSession().then(() => router.replace('/login'))
        }
      }
    ])
  }

  return (
    <ScrollView
      className="flex-1 bg-bgl dark:bg-bgd"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingHorizontal: 16 }}
    >
      <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">我的</Text>

      {/* 账号卡 */}
      <View className="mt-4 flex-row items-center rounded-3xl bg-white p-5 shadow-sm dark:bg-cardd">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-brand/10 dark:bg-brand-dark/15">
          <Text className="text-2xl">{me?.pro ? '👑' : '🎓'}</Text>
        </View>
        <View className="ml-4 flex-1">
          <Text className="text-base font-semibold text-gray-900 dark:text-gray-100" numberOfLines={1}>
            {email || '未登录'}
          </Text>
          <Text className="mt-0.5 text-xs text-gray-400">{me?.pro ? 'Pro 会员' : '免费版'}</Text>
        </View>
      </View>

      {/* 外观 */}
      <View className="mt-4 rounded-3xl bg-white p-5 shadow-sm dark:bg-cardd">
        <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">外观</Text>
        <View className="mt-3 flex-row gap-2">
          {MODES.map(m => (
            <ScaleButton
              key={m.key}
              className={`min-h-[64px] flex-1 items-center justify-center rounded-2xl border-2 py-3 ${
                mode === m.key
                  ? 'border-brand bg-brand/5 dark:border-brand-dark dark:bg-brand-dark/10'
                  : 'border-transparent bg-gray-50 dark:bg-white/5'
              }`}
              onPress={() => setMode(m.key)}
            >
              <Text className="text-xl">{m.icon}</Text>
              <Text
                className={`mt-1 text-xs font-medium ${
                  mode === m.key ? 'text-brand dark:text-brand-dark' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {m.label}
              </Text>
            </ScaleButton>
          ))}
        </View>
        <View className="mt-4 flex-row items-center justify-between">
          <View>
            <Text className="text-sm text-gray-800 dark:text-gray-200">解析大字模式</Text>
            <Text className="mt-0.5 text-xs text-gray-400">成绩页解析文字放大，护眼易读</Text>
          </View>
          <Switch value={bigFont} onValueChange={setBigFont} trackColor={{ true: pal.brand }} />
        </View>
      </View>

      {/* 关于 */}
      <View className="mt-4 rounded-3xl bg-white p-5 shadow-sm dark:bg-cardd">
        <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">关于</Text>
        <View className="mt-3 flex-row items-center justify-between">
          <Text className="text-sm text-gray-500 dark:text-gray-400">版本</Text>
          <Text style={{ fontVariant: ['tabular-nums'] }} className="text-sm text-gray-400">
            1.0.0
          </Text>
        </View>
        <View className="mt-3 flex-row items-center justify-between">
          <Text className="text-sm text-gray-500 dark:text-gray-400">数据源</Text>
          <Text className="text-sm text-gray-400">zhenti.zalize.com</Text>
        </View>
      </View>

      <ScaleButton
        className="mt-6 min-h-[50px] items-center justify-center rounded-2xl bg-white dark:bg-cardd"
        onPress={doLogout}
      >
        <Text className="text-base font-medium text-rose">退出登录</Text>
      </ScaleButton>

      <Text className="mt-6 text-center text-xs text-gray-300 dark:text-gray-600">
        真题工坊 · 考研政治历年真题
      </Text>
    </ScrollView>
  )
}
