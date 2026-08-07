import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import { RefreshControl, ScrollView, Text, View } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ScaleButton from '../../components/ScaleButton'
import { useToast } from '../../components/Toast'
import { ApiError, api, getToken, nextExam, streakDays } from '../../lib/api'
import { hapticSuccess } from '../../lib/haptics'

export default function Home() {
  const router = useRouter()
  const { toast } = useToast()
  const insets = useSafeAreaInsets()
  const [checkDays, setCheckDays] = useState<string[]>([])
  const [wrongDue, setWrongDue] = useState(0)
  const [doneToday, setDoneToday] = useState(false)
  const [kps, setKps] = useState<{ kp: string; total: number; correct: number }[]>([])
  const [latestYear, setLatestYear] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const todayStr = new Date().toISOString().slice(0, 10)
  const streak = streakDays(checkDays)
  const { days } = nextExam()

  const load = useCallback(() => {
    api.stats()
      .then(s => {
        setWrongDue(s.wrong_due ?? 0)
        const atts = s.attempts ?? []
        setDoneToday(atts.some(a => String(a.created_at).slice(0, 10) === todayStr))
      })
      .catch(() => undefined)
    api.checkin().then(r => setCheckDays(r.days ?? [])).catch(() => undefined)
    api.kpstats().then(r => setKps((r.kps ?? []).slice(0, 2))).catch(() => undefined)
    api.realYears()
      .then(r => setLatestYear(r.years?.[0]?.year ?? null))
      .catch(() => undefined)
  }, [todayStr])

  useFocusEffect(
    useCallback(() => {
      if (!getToken()) {
        router.replace('/login')
        return
      }
      load()
    }, [load, router])
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

  const doCheckin = () => {
    if (checkDays.includes(todayStr)) return toast(`已连续打卡 ${streak} 天，继续保持！`)
    api.checkinPost()
      .then(() => {
        setCheckDays([todayStr, ...checkDays])
        hapticSuccess()
        toast('今日打卡成功 ✓')
      })
      .catch(e => toast(e instanceof ApiError ? e.message : '打卡失败'))
  }

  const tasks = [
    ...(wrongDue > 0 ? [{ label: `复习 ${wrongDue} 道到期错题`, done: false, go: () => router.push('/(tabs)/wrong') }] : []),
    { label: '完成 1 卷真题模考', done: doneToday, go: () => router.push('/(tabs)/practice') },
    { label: '今日打卡', done: checkDays.includes(todayStr), go: doCheckin }
  ]

  return (
    <ScrollView
      className="flex-1 bg-bgl dark:bg-bgd"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingHorizontal: 16 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            load()
            setTimeout(() => setRefreshing(false), 600)
          }}
        />
      }
    >
      {/* 考研倒计时 */}
      <Animated.View entering={FadeInUp.duration(350)}>
        <View className="rounded-3xl bg-brand p-6 shadow-lg shadow-brand/30 dark:bg-brand-dark">
          <Text className="text-sm text-white/80">距 2027 考研还有</Text>
          <View className="mt-1 flex-row items-end">
            <Text style={{ fontVariant: ['tabular-nums'] }} className="text-5xl font-bold text-white">
              {days}
            </Text>
            <Text className="mb-1.5 ml-2 text-lg text-white/90">天</Text>
          </View>
          <View className="mt-3 flex-row items-center">
            <Text className="text-sm text-white/90">🔥 连续打卡 </Text>
            <Text style={{ fontVariant: ['tabular-nums'] }} className="text-sm font-bold text-white">
              {streak}
            </Text>
            <Text className="text-sm text-white/90"> 天</Text>
          </View>
        </View>
      </Animated.View>

      {/* 今日任务 */}
      <Animated.View entering={FadeInUp.delay(80).duration(350)}>
        <View className="mt-4 rounded-3xl bg-white p-5 shadow-sm dark:bg-cardd">
          <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">今日任务</Text>
          {tasks.map(t => (
            <ScaleButton
              key={t.label}
              className="mt-3 min-h-[48px] flex-row items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5"
              onPress={t.go}
            >
              <View className="flex-row items-center">
                <Text className="text-lg">{t.done ? '✅' : '⬜'}</Text>
                <Text
                  className={`ml-3 text-sm ${
                    t.done ? 'text-gray-400 line-through dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'
                  }`}
                >
                  {t.label}
                </Text>
              </View>
              <Text className="text-gray-400">›</Text>
            </ScaleButton>
          ))}
        </View>
      </Animated.View>

      {/* 快捷入口 */}
      <Animated.View entering={FadeInUp.delay(160).duration(350)}>
        <View className="mt-4 flex-row gap-3">
          <ScaleButton
            className="min-h-[92px] flex-1 justify-between rounded-3xl bg-white p-4 shadow-sm dark:bg-cardd"
            onPress={() => void withPaper(() => api.realPaper(latestYear ?? new Date().getFullYear()))}
          >
            <Text className="text-2xl">📝</Text>
            <View>
              <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {latestYear ?? '最新'} 年真题
              </Text>
              <Text className="mt-0.5 text-xs text-gray-400">整卷模考</Text>
            </View>
          </ScaleButton>
          <ScaleButton
            className="min-h-[92px] flex-1 justify-between rounded-3xl bg-white p-4 shadow-sm dark:bg-cardd"
            onPress={() => void withPaper(() => api.realRandPaper())}
          >
            <Text className="text-2xl">🎲</Text>
            <View>
              <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">随机抽题</Text>
              <Text className="mt-0.5 text-xs text-gray-400">跨年份混编</Text>
            </View>
          </ScaleButton>
          <ScaleButton
            className="min-h-[92px] flex-1 justify-between rounded-3xl bg-white p-4 shadow-sm dark:bg-cardd"
            onPress={() => {
              if (!kps.length) return toast('先刷几卷真题，弱项榜就有数据了')
              void withPaper(() => api.realWeak(kps.map(k => k.kp)))
            }}
          >
            <Text className="text-2xl">🎯</Text>
            <View>
              <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">弱项补练</Text>
              <Text className="mt-0.5 text-xs text-gray-400">薄弱考点</Text>
            </View>
          </ScaleButton>
        </View>
      </Animated.View>

      {/* 弱项榜 */}
      {kps.length > 0 && (
        <Animated.View entering={FadeInUp.delay(240).duration(350)}>
          <View className="mt-4 rounded-3xl bg-white p-5 shadow-sm dark:bg-cardd">
            <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">薄弱考点</Text>
            {kps.map(k => {
              const r = Math.round((k.correct / Math.max(1, k.total)) * 100)
              const color = r < 50 ? 'bg-rose' : r < 70 ? 'bg-warn' : 'bg-ok'
              return (
                <View key={k.kp} className="mt-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="flex-1 text-sm text-gray-800 dark:text-gray-200" numberOfLines={1}>
                      {k.kp}
                    </Text>
                    <Text
                      style={{ fontVariant: ['tabular-nums'] }}
                      className="ml-2 text-xs text-gray-400"
                    >
                      {k.correct}/{k.total}
                    </Text>
                  </View>
                  <View className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                    <View className={`h-full rounded-full ${color}`} style={{ width: `${r}%` }} />
                  </View>
                </View>
              )
            })}
          </View>
        </Animated.View>
      )}
    </ScrollView>
  )
}
