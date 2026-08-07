import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ScaleButton from '../../components/ScaleButton'
import { useToast } from '../../components/Toast'
import { ApiError, YearRow, api, getToken } from '../../lib/api'

export default function Practice() {
  const router = useRouter()
  const { toast } = useToast()
  const insets = useSafeAreaInsets()
  const [years, setYears] = useState<YearRow[]>([])
  const [kps, setKps] = useState<{ kp_name: string; n: number }[]>([])
  const [tab, setTab] = useState<'year' | 'kp'>('year')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useFocusEffect(
    useCallback(() => {
      if (!getToken()) {
        router.replace('/login')
        return
      }
      api.realYears()
        .then(r => setYears(r.years ?? []))
        .catch(() => undefined)
        .finally(() => setLoading(false))
      api.realKps()
        .then(r => setKps([...(r.kps ?? [])].sort((a, b) => b.n - a.n).slice(0, 24)))
        .catch(() => undefined)
    }, [router])
  )

  const withPaper = async (fn: () => Promise<{ id: number }>) => {
    if (busy) return
    setBusy(true)
    try {
      const r = await fn()
      router.push(`/exam/${r.id}`)
    } catch (e) {
      toast(e instanceof ApiError ? e.message : '组卷失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  const openYear = (y: YearRow) => {
    if (y.last_total != null && y.paper_id) {
      router.push(`/result/${y.paper_id}`)
      return
    }
    void withPaper(() => api.realPaper(y.year))
  }

  const latest = years.length ? years[0].year : 0

  return (
    <View className="flex-1 bg-bgl dark:bg-bgd" style={{ paddingTop: insets.top + 12 }}>
      <View className="px-4">
        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">刷真题</Text>
        <View className="mt-4 flex-row rounded-2xl bg-gray-200/70 p-1 dark:bg-cardd">
          {(
            [
              ['year', '按年份'],
              ['kp', '按考点']
            ] as const
          ).map(([k, label]) => (
            <ScaleButton
              key={k}
              haptic={false}
              className={`min-h-[44px] flex-1 items-center justify-center rounded-xl ${
                tab === k ? 'bg-white dark:bg-brand-dark/20' : ''
              }`}
              onPress={() => setTab(k)}
            >
              <Text
                className={`text-sm font-medium ${
                  tab === k ? 'text-brand dark:text-brand-dark' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {label}
              </Text>
            </ScaleButton>
          ))}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : tab === 'year' ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          <Text className="mb-2 text-xs text-gray-400">
            2010-{latest || 2026} 历年考研政治真题 · 整卷模考 · 免费不限次
          </Text>
          {years.map((y, i) => {
            const isNew = y.year === latest
            const rate = y.last_total ? Math.round(((y.last_score ?? 0) / y.last_total) * 100) : null
            const rateCls =
              rate == null
                ? ''
                : rate < 50
                  ? 'text-rose'
                  : rate < 70
                    ? 'text-warn'
                    : 'text-ok dark:text-ok-dark'
            return (
              <Animated.View key={y.year} entering={FadeInUp.delay(Math.min(i * 40, 400)).duration(300)}>
                <ScaleButton
                  className="mb-3 min-h-[72px] flex-row items-center rounded-3xl bg-white p-4 shadow-sm dark:bg-cardd"
                  onPress={() => openYear(y)}
                >
                  <View
                    className={`h-12 w-12 items-center justify-center rounded-2xl ${
                      isNew ? 'bg-rose/10' : 'bg-brand/10 dark:bg-brand-dark/15'
                    }`}
                  >
                    <Text
                      style={{ fontVariant: ['tabular-nums'] }}
                      className={`text-lg font-bold ${isNew ? 'text-rose' : 'text-brand dark:text-brand-dark'}`}
                    >
                      {String(y.year).slice(2)}
                    </Text>
                  </View>
                  <View className="ml-3 flex-1">
                    <View className="flex-row items-center">
                      <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {y.year} 年真题
                      </Text>
                      {isNew && (
                        <View className="ml-2 rounded-full bg-rose px-2 py-0.5">
                          <Text className="text-[10px] font-bold text-white">NEW</Text>
                        </View>
                      )}
                    </View>
                    <Text className="mt-0.5 text-xs text-gray-400">
                      {y.n} 题{rate != null ? ` · 已模考` : ' · 未模考'}
                    </Text>
                  </View>
                  {rate != null ? (
                    <Text style={{ fontVariant: ['tabular-nums'] }} className={`text-base font-bold ${rateCls}`}>
                      {rate}%
                    </Text>
                  ) : (
                    <Text className="text-sm font-medium text-brand dark:text-brand-dark">模考 ›</Text>
                  )}
                </ScaleButton>
              </Animated.View>
            )
          })}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          <Text className="mb-3 text-xs text-gray-400">按考点专项组卷 · 选一个考点开始</Text>
          <View className="flex-row flex-wrap gap-2">
            {kps.map(k => (
              <ScaleButton
                key={k.kp_name}
                className="min-h-[44px] flex-row items-center rounded-2xl bg-white px-4 py-2.5 shadow-sm dark:bg-cardd"
                onPress={() => void withPaper(() => api.realKp(k.kp_name))}
              >
                <Text className="text-sm text-gray-800 dark:text-gray-200">{k.kp_name}</Text>
                <Text style={{ fontVariant: ['tabular-nums'] }} className="ml-1.5 text-xs text-gray-400">
                  {k.n}
                </Text>
              </ScaleButton>
            ))}
          </View>
          {kps.length === 0 && <Text className="text-center text-sm text-gray-400">考点加载中…</Text>}
        </ScrollView>
      )}
      {busy && (
        <View className="absolute inset-0 items-center justify-center bg-black/20">
          <View className="rounded-2xl bg-white px-6 py-4 dark:bg-cardd">
            <ActivityIndicator />
            <Text className="mt-2 text-sm text-gray-600 dark:text-gray-300">组卷中…</Text>
          </View>
        </View>
      )}
    </View>
  )
}
