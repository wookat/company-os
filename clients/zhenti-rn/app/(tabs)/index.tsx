import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import { RefreshControl, ScrollView, Text, View } from 'react-native'
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ScaleButton from '../../components/ScaleButton'
import { useToast } from '../../components/Toast'
import { ApiError, DailyQ, api, bjDateStr, getToken, getUser, nextExam, streakDays } from '../../lib/api'
import { hapticLight, hapticSuccess } from '../../lib/haptics'

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
  const [daily, setDaily] = useState<DailyQ | null>(null)
  const [revealed, setRevealed] = useState(false)

  // 北京时间日界：后端打卡/额度/每日一题均按北京时间判定「今天」
  const todayStr = bjDateStr()
  const revealKey = `zt_daily_reveal:${getUser()?.id ?? ''}`
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
    api.realDaily()
      .then(r => setDaily(r.q ?? null))
      .catch(() => undefined)
    // 每日一题揭晓状态按天持久：当天已揭晓则切页回来仍保持展开
    void AsyncStorage.getItem(revealKey).then(v => setRevealed(v === todayStr))
  }, [todayStr, revealKey])

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

  // 每日一题：先想再揭晓；揭晓即可打卡（src=daily，当天未打卡时）
  const reveal = () => {
    if (revealed || !daily) return
    hapticLight()
    setRevealed(true)
    void AsyncStorage.setItem(revealKey, todayStr)
    void api.dailyReveal().catch(() => undefined)
    if (!checkDays.includes(todayStr)) {
      api.checkinPost('daily')
        .then(() => {
          setCheckDays([todayStr, ...checkDays])
          hapticSuccess()
          toast('今日打卡成功 ✓')
        })
        .catch(e => {
          if (e instanceof ApiError && e.status === 409) toast(e.message)
        })
    }
  }

  // 连击里程碑：7/21/50/100 天
  const milestones = [7, 21, 50, 100]
  const nextMilestone = milestones.find(m => m > streak) ?? null

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
            {milestones.includes(streak) && <Text className="ml-2 text-sm text-white">🏅 达成 {streak} 天里程碑！</Text>}
            {streak > 0 && nextMilestone != null && !milestones.includes(streak) && (
              <Text className="ml-2 text-xs text-white/80">再坚持 {nextMilestone - streak} 天解锁 {nextMilestone} 天里程碑</Text>
            )}
          </View>
        </View>
      </Animated.View>

      {/* 每日一题：揭晓即可打卡（src=daily） */}
      {daily && (
        <Animated.View entering={FadeInUp.delay(40).duration(350)}>
          <View className="mt-4 rounded-3xl bg-white p-5 shadow-sm dark:bg-cardd">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">每日一题</Text>
              <Text className="text-xs text-gray-400">
                {daily.year} 年第 {daily.seq} 题{daily.qtype === 'multi' ? ' · 多选' : ''}
              </Text>
            </View>
            <Text className="mt-2 text-sm leading-6 text-gray-900 dark:text-gray-100">{daily.stem}</Text>
            <View className="mt-3 gap-2">
              {(
                [
                  ['A', daily.opt_a],
                  ['B', daily.opt_b],
                  ['C', daily.opt_c],
                  ['D', daily.opt_d]
                ] as const
              ).map(([k, v]) => {
                const right = revealed && daily.answer.includes(k)
                return (
                  <View
                    key={k}
                    className={`rounded-xl px-3 py-2 ${right ? 'bg-ok/10' : 'bg-gray-50 dark:bg-white/5'}`}
                  >
                    <Text className={`text-sm leading-6 ${right ? 'font-medium text-ok dark:text-ok-dark' : 'text-gray-700 dark:text-gray-300'}`}>
                      {right ? '✓ ' : ''}
                      {k}. {v}
                    </Text>
                  </View>
                )
              })}
            </View>
            {!revealed ? (
              <ScaleButton
                className="mt-4 min-h-[48px] items-center justify-center rounded-2xl bg-brand dark:bg-brand-dark"
                onPress={reveal}
              >
                <Text className="text-sm font-semibold text-white">先想好答案，再点我揭晓（揭晓即打卡）</Text>
              </ScaleButton>
            ) : (
              <Animated.View entering={FadeIn.duration(220)}>
                <Text className="mt-3 text-sm font-medium text-ok dark:text-ok-dark">答案：{daily.answer}</Text>
                {!!daily.analysis && (
                  <Text className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">解析：{daily.analysis}</Text>
                )}
                {!!daily.kp_name && (
                  <ScaleButton
                    className="mt-3 min-h-[44px] items-center justify-center rounded-2xl bg-gray-100 dark:bg-white/10"
                    onPress={() => void withPaper(() => api.realKp(daily.kp_name!))}
                  >
                    <Text className="text-sm font-medium text-brand dark:text-brand-dark">
                      这个考点直练：{daily.kp_name} ›
                    </Text>
                  </ScaleButton>
                )}
              </Animated.View>
            )}
          </View>
        </Animated.View>
      )}

      {/* 72 小时冲刺包入口 */}
      <Animated.View entering={FadeInUp.delay(60).duration(350)}>
        <ScaleButton
          className="mt-4 min-h-[68px] flex-row items-center rounded-3xl bg-white p-4 shadow-sm dark:bg-cardd"
          onPress={() => router.push('/sprint')}
        >
          <Text className="text-2xl">⚡</Text>
          <View className="ml-3 flex-1">
            <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">72 小时冲刺包</Text>
            <Text className="mt-0.5 text-xs text-gray-400">错题清账 · 薄弱定向 · 全真检验，3 天一套计划</Text>
          </View>
          <Text className="text-sm font-medium text-brand dark:text-brand-dark">去冲刺 ›</Text>
        </ScaleButton>
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
          <ScaleButton
            className="min-h-[92px] flex-1 justify-between rounded-3xl bg-white p-4 shadow-sm dark:bg-cardd"
            onPress={() => router.push('/recite')}
          >
            <Text className="text-2xl">🗣️</Text>
            <View>
              <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">分析题背诵</Text>
              <Text className="mt-0.5 text-xs text-gray-400">挖空自测</Text>
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
