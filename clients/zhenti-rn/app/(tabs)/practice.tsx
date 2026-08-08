import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import { ActivityIndicator, Modal, ScrollView, Text, View } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ScaleButton from '../../components/ScaleButton'
import { useToast } from '../../components/Toast'
import { ApiError, ShizhengStats, YearRow, api, bjDateStr, getToken } from '../../lib/api'

export default function Practice() {
  const router = useRouter()
  const { toast } = useToast()
  const insets = useSafeAreaInsets()
  const [years, setYears] = useState<YearRow[]>([])
  const [kps, setKps] = useState<{ kp_name: string; n: number }[]>([])
  const [tab, setTab] = useState<'year' | 'kp'>('year')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [sz, setSz] = useState<ShizhengStats | null>(null)
  const [mockYear, setMockYear] = useState<YearRow | null>(null)
  const [mockBusy, setMockBusy] = useState(false)

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
      api.shizhengStats().then(setSz).catch(() => undefined)
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
  const thisYm = bjDateStr().slice(0, 7)

  // 全真模考：说明弹窗确认后组卷/复用（客观题全量 + 5 道分析题，180 分钟）；已考完直接进成绩页
  const startMock = async (y: YearRow) => {
    if (mockBusy) return
    setMockBusy(true)
    try {
      const r = await api.realMockPaper(y.year)
      if (r.existed) {
        const finished = await api.result(r.id).then(() => true).catch(() => false)
        if (finished) {
          setMockYear(null)
          router.push(`/result/${r.id}`)
          return
        }
      }
      setMockYear(null)
      router.push(`/exam/${r.id}`)
    } catch (e) {
      toast(e instanceof ApiError ? e.message : '组卷失败，请重试')
    } finally {
      setMockBusy(false)
    }
  }

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
          {/* 时政月更专区（动态角标：本月已更新 / 更新至 YYYY-MM） */}
          <Animated.View entering={FadeInUp.duration(300)}>
            <ScaleButton
              className="mb-3 min-h-[72px] flex-row items-center rounded-3xl bg-white p-4 shadow-sm dark:bg-cardd"
              onPress={() => void withPaper(() => api.realShizheng())}
            >
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-warn/10">
                <Text className="text-2xl">📰</Text>
              </View>
              <View className="ml-3 flex-1">
                <View className="flex-row items-center">
                  <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">时政月更专区</Text>
                  <View className={`ml-2 rounded-full px-2 py-0.5 ${sz && sz.latest_ym === thisYm ? 'bg-ok' : 'bg-rose'}`}>
                    <Text className="text-[10px] font-bold text-white">
                      {sz && sz.latest_ym === thisYm ? `本月已更新 ${sz.latest_count} 题` : sz?.latest_ym ? `更新至 ${sz.latest_ym}` : 'NEW'}
                    </Text>
                  </View>
                </View>
                <Text className="mt-0.5 text-xs text-gray-400">
                  形势与政策 · 近一年重大时政逐月命题{sz?.latest_ym ? ` · 更新至 ${sz.latest_ym}` : ''}
                </Text>
              </View>
              <Text className="text-sm font-medium text-brand dark:text-brand-dark">开卷 ›</Text>
            </ScaleButton>
          </Animated.View>
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
                  <ScaleButton
                    className="ml-2 min-h-[44px] items-center justify-center rounded-xl border border-brand/40 px-3 dark:border-brand-dark/50"
                    onPress={() => setMockYear(y)}
                  >
                    <Text className="text-xs font-medium text-brand dark:text-brand-dark">全真模考</Text>
                  </ScaleButton>
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

      {/* 全真模考说明弹窗（题量动态：客观 n 题 + 5 道分析题） */}
      <Modal visible={mockYear != null} transparent animationType="fade" onRequestClose={() => setMockYear(null)}>
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full rounded-3xl bg-white p-6 dark:bg-cardd">
            <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">{mockYear?.year} 年全真模考</Text>
            <View className="mt-3 gap-2">
              <Text className="text-sm leading-6 text-gray-600 dark:text-gray-300">
                📝 整卷 {(mockYear?.n ?? 0) + 5} 题：{mockYear?.n} 道客观题（单选 + 多选）+ 5 道材料分析题，先客观后主观，可自由跳转
              </Text>
              <Text className="text-sm leading-6 text-gray-600 dark:text-gray-300">
                ⏱ 限时 180 分钟倒计时，剩 5 分钟变红，到时自动交卷；作答自动保存，退出重进不丢
              </Text>
              <Text className="text-sm leading-6 text-gray-600 dark:text-gray-300">
                ✅ 客观题自动判分（单选 1 分 / 多选 2 分）；分析题对照参考要点自评，也可交给 AI 逐点批改（每日 10 次）
              </Text>
              <Text className="text-sm leading-6 text-gray-600 dark:text-gray-300">
                🆓 真题免费，不占出题额度；同一年份复用同一张卷，已考完的年份直接进成绩页复盘
              </Text>
            </View>
            <ScaleButton
              className="mt-5 min-h-[50px] items-center justify-center rounded-2xl bg-brand dark:bg-brand-dark"
              onPress={() => mockYear && void startMock(mockYear)}
            >
              <Text className="text-base font-semibold text-white">{mockBusy ? '组卷中…' : '开始模考'}</Text>
            </ScaleButton>
            <ScaleButton
              className="mt-2 min-h-[46px] items-center justify-center rounded-2xl bg-gray-100 dark:bg-white/10"
              onPress={() => setMockYear(null)}
            >
              <Text className="text-sm font-medium text-gray-600 dark:text-gray-300">再想想</Text>
            </ScaleButton>
          </View>
        </View>
      </Modal>
    </View>
  )
}
