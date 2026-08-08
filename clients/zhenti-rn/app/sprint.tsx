import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ScaleButton from '../components/ScaleButton'
import { useToast } from '../components/Toast'
import { ApiError, api, getToken, getUser } from '../lib/api'
import { hapticLight } from '../lib/haptics'

const HOURS = 72

type SprintGo =
  | { type: 'route'; url: '/(tabs)/wrong' | '/recite' }
  | { type: 'weak'; kps: string[] }
  | { type: 'kp'; name: string }
  | { type: 'rand' }
  | { type: 'shizheng' }
  | { type: 'mock'; year: number }

interface SprintTask {
  id: string
  label: string
  desc: string
  minutes: number
  go: SprintGo
  goText: string
}

interface SprintDay {
  title: string
  sub: string
  tasks: SprintTask[]
}

interface SprintPlan {
  at: number
  days: SprintDay[]
  memoKps: string[]
}

const storeKey = (uid: number | string) => `zt_sprint72:${uid}`

// 纯规则生成 3 天计划：Day1 错题清账 / Day2 薄弱定向 / Day3 全真检验（与 Web/Taro 口径一致）
async function buildPlan(): Promise<SprintPlan> {
  const [stats, kpstats, allKps, subjKps, years] = await Promise.all([
    api.stats().catch(() => null),
    api.kpstats().catch(() => null),
    api.realKps().catch(() => null),
    api.subjKps().catch(() => null),
    api.realYears().catch(() => null)
  ])

  const wrongDue = stats?.wrong_due ?? 0
  const wrongCount = stats?.wrong_count ?? 0
  const latestYear = years?.years?.[0]?.year ?? 2026

  // 个人薄弱考点：同一考点作答满 2 题、正确率最低的 3-5 个；数据不足用全站高频考点兜底
  const personalWeak = (kpstats?.kps ?? [])
    .filter(k => k.total >= 2 && k.correct / k.total < 0.8)
    .slice(0, 5)
    .map(k => k.kp)
  const hotKps = [...(allKps?.kps ?? [])].sort((a, b) => b.n - a.n).slice(0, 5).map(k => k.kp_name)
  const weakKps =
    personalWeak.length >= 3
      ? personalWeak
      : [...personalWeak, ...hotKps.filter(k => !personalWeak.includes(k))].slice(0, 5)
  const isFallback = personalWeak.length < 3

  // 分析题背诵清单：近 2 年高频考点
  const memoKps = [
    ...new Set((subjKps?.kps ?? []).filter(k => k.year >= latestYear - 1).map(k => k.kp_name))
  ].slice(0, 8)

  const day1: SprintTask[] = []
  if (wrongDue > 0)
    day1.push({
      id: 'd1-due',
      label: `复习 ${wrongDue} 道到期错题`,
      desc: '间隔重复到期队列，先清账再往前走',
      minutes: Math.min(60, Math.max(15, Math.round(wrongDue * 1.5))),
      go: { type: 'route', url: '/(tabs)/wrong' },
      goText: '去复习'
    })
  if (wrongCount > 0)
    day1.push({
      id: 'd1-practice',
      label: '顽固错题重练一遍',
      desc: `错题本共 ${wrongCount} 道，重练到全对为止`,
      minutes: Math.min(50, Math.max(20, wrongCount)),
      go: { type: 'route', url: '/(tabs)/wrong' },
      goText: '去重练'
    })
  if (day1.length === 0)
    day1.push({
      id: 'd1-weak',
      label: '薄弱考点真题特训',
      desc: `${isFallback ? '全站高频考点' : '你的薄弱考点'}：${weakKps.slice(0, 3).join('、')}`,
      minutes: 30,
      go: { type: 'weak', kps: weakKps.slice(0, 3) },
      goText: '开卷'
    })
  day1.push({
    id: 'd1-rand',
    label: '真题快刷 20 题',
    desc: '全库随机抽题，保持手感',
    minutes: 25,
    go: { type: 'rand' },
    goText: '去快刷'
  })

  const day2: SprintTask[] = [
    {
      id: 'd2-weak',
      label: '薄弱考点定向组卷',
      desc: `${isFallback ? '数据不足，按全站高频易错考点兜底' : '按你的正确率最低考点组卷'}：${weakKps.slice(0, 3).join('、')}`,
      minutes: 30,
      go: { type: 'weak', kps: weakKps.slice(0, 3) },
      goText: '开卷'
    }
  ]
  if (weakKps[3])
    day2.push({
      id: 'd2-kp1',
      label: `考点特训 · ${weakKps[3]}`,
      desc: '该考点历年真题连做 10 题',
      minutes: 20,
      go: { type: 'kp', name: weakKps[3] },
      goText: '开卷'
    })
  day2.push({
    id: 'd2-rand',
    label: '快刷 20 题巩固',
    desc: '定向练完全库混刷，检验迁移',
    minutes: 25,
    go: { type: 'rand' },
    goText: '去快刷'
  })

  const day3: SprintTask[] = [
    {
      id: 'd3-sz',
      label: '时政 20 题',
      desc: '形势与政策月更题，考前必过一遍',
      minutes: 30,
      go: { type: 'shizheng' },
      goText: '开卷'
    },
    {
      id: 'd3-mock',
      label: `${latestYear} 全真模考`,
      desc: '180 分钟整卷（客观+分析题）；时间紧可改做随机 20 题快刷',
      minutes: 180,
      go: { type: 'mock', year: latestYear },
      goText: '开考'
    },
    {
      id: 'd3-memo',
      label: '分析题背诵清单',
      desc: memoKps.length
        ? `近 2 年高频：${memoKps.slice(0, 4).join('、')}${memoKps.length > 4 ? ' 等' : ''}`
        : '先想再看，逐条自评',
      minutes: 40,
      go: { type: 'route', url: '/recite' },
      goText: '去背诵'
    }
  ]

  return {
    at: Date.now(),
    memoKps,
    days: [
      { title: 'Day 1 · 错题清账', sub: '把欠的账先还上，错过的分不再错第二次', tasks: day1 },
      { title: 'Day 2 · 薄弱定向', sub: '正确率最低的考点，集中火力补短板', tasks: day2 },
      { title: 'Day 3 · 全真检验', sub: '按考场节奏走一遍，背诵收尾', tasks: day3 }
    ]
  }
}

// 72h 倒计时文案：剩余 X 天 Y 小时 / X 小时 Y 分
function fmtLeft(ms: number): string {
  if (ms <= 0) return '已结束'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h >= 24) return `${Math.floor(h / 24)} 天 ${h % 24} 小时`
  return m > 0 ? `${h} 小时 ${m} 分` : `${h} 小时`
}

export default function Sprint() {
  const router = useRouter()
  const { toast } = useToast()
  const insets = useSafeAreaInsets()
  const uid = getUser()?.id ?? ''
  const [plan, setPlan] = useState<SprintPlan | null>(null)
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  const persist = useCallback(
    (p: SprintPlan, d: Record<string, boolean>) => {
      void AsyncStorage.setItem(storeKey(uid), JSON.stringify({ plan: p, done: d }))
    },
    [uid]
  )

  const generate = useCallback(async () => {
    setLoading(true)
    try {
      const p = await buildPlan()
      setPlan(p)
      setDone({})
      persist(p, {})
    } catch {
      toast('生成失败，请稍后重试')
    }
    setLoading(false)
  }, [persist, toast])

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(storeKey(uid))
        const saved = raw ? (JSON.parse(raw) as { plan?: SprintPlan; done?: Record<string, boolean> }) : null
        if (saved?.plan?.days) {
          setPlan(saved.plan)
          setDone(saved.done ?? {})
          setLoading(false)
          return
        }
      } catch {
        /* 忽略损坏数据，重新生成 */
      }
      void generate()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid])

  const toggle = (id: string) => {
    if (!plan) return
    hapticLight()
    const d = { ...done, [id]: !done[id] }
    setDone(d)
    persist(plan, d)
  }

  const go = async (t: SprintTask) => {
    const g = t.go
    if (g.type === 'route') {
      router.push(g.url)
      return
    }
    if (busy) return
    setBusy(t.id)
    try {
      if (g.type === 'weak') {
        const r = await api.realWeak(g.kps)
        router.push(`/exam/${r.id}`)
      } else if (g.type === 'kp') {
        const r = await api.realKp(g.name)
        router.push(`/exam/${r.id}`)
      } else if (g.type === 'rand') {
        const r = await api.realRandPaper()
        router.push(`/exam/${r.id}`)
      } else if (g.type === 'shizheng') {
        const r = await api.realShizheng()
        router.push(`/exam/${r.id}`)
      } else {
        const r = await api.realMockPaper(g.year)
        // 已考完的年份直接进成绩页复盘
        if (r.existed) {
          const finished = await api.result(r.id).then(() => true).catch(() => false)
          if (finished) {
            router.push(`/result/${r.id}`)
            setBusy('')
            return
          }
        }
        router.push(`/exam/${r.id}`)
      }
    } catch (e) {
      toast(e instanceof ApiError ? e.message : '组卷失败，请重试')
    }
    setBusy('')
  }

  const allTasks = useMemo(() => (plan?.days ?? []).flatMap(d => d.tasks), [plan])
  const doneN = allTasks.filter(t => done[t.id]).length
  const pct = allTasks.length ? Math.round((doneN / allTasks.length) * 100) : 0
  const leftMs = plan ? plan.at + HOURS * 3600000 - now : 0

  // 重新生成需确认并重置勾选进度
  const regenerate = () => {
    if (doneN > 0) {
      Alert.alert('重新生成', '重新生成会重置所有勾选进度，确定？', [
        { text: '再想想', style: 'cancel' },
        { text: '重新生成', style: 'destructive', onPress: () => void generate() }
      ])
      return
    }
    void generate()
  }

  if (loading || !plan) {
    return (
      <View className="flex-1 items-center justify-center bg-bgl dark:bg-bgd">
        <ActivityIndicator size="large" />
        <Text className="mt-3 text-sm text-gray-400">计划生成中…</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-bgl dark:bg-bgd" style={{ paddingTop: insets.top + 8 }}>
      {/* 顶栏 */}
      <View className="flex-row items-center justify-between px-4 pb-2">
        <ScaleButton className="min-h-[44px] min-w-[44px] items-center justify-center" onPress={() => router.back()}>
          <Text className="text-2xl text-gray-500 dark:text-gray-400">‹</Text>
        </ScaleButton>
        <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">⚡ 72 小时冲刺包</Text>
        <View className="min-w-[44px]" />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
        <Text className="text-xs leading-5 text-gray-500 dark:text-gray-400">
          考前 / 周末冲刺专用：3 天把「错题、弱项、实战」各过一遍，每块都可直达。
        </Text>

        {/* 整体进度 */}
        <Animated.View entering={FadeInUp.duration(300)}>
          <View className="mt-3 rounded-3xl bg-white p-5 shadow-sm dark:bg-cardd">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  整体进度 <Text style={{ fontVariant: ['tabular-nums'] }}>{doneN}</Text>/{allTasks.length}
                </Text>
                <Text className="mt-1 text-xs text-gray-400">⏳ 剩余 {fmtLeft(leftMs)}</Text>
              </View>
              <ScaleButton
                className="min-h-[40px] items-center justify-center rounded-xl bg-gray-100 px-3 dark:bg-white/10"
                onPress={regenerate}
              >
                <Text className="text-xs font-medium text-gray-600 dark:text-gray-300">↻ 重新生成</Text>
              </ScaleButton>
            </View>
            <View className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
              <View className="h-full rounded-full bg-brand dark:bg-brand-dark" style={{ width: `${pct}%` }} />
            </View>
            <Text className="mt-2 text-xs text-gray-400">做完任务回本页手动勾选 · 进度按账号保存在本机</Text>
            {leftMs <= 0 && (
              <Text className="mt-1 text-xs text-rose">72 小时已到，点「重新生成」开始新一轮冲刺</Text>
            )}
          </View>
        </Animated.View>

        {/* 3 天任务 */}
        {plan.days.map((d, di) => {
          const dn = d.tasks.filter(t => done[t.id]).length
          return (
            <Animated.View key={d.title} entering={FadeInUp.delay(80 * (di + 1)).duration(300)}>
              <View className="mt-4 rounded-3xl bg-white p-5 shadow-sm dark:bg-cardd">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className="h-4 w-1.5 rounded-full bg-brand dark:bg-brand-dark" />
                    <Text className="ml-2 text-base font-semibold text-gray-900 dark:text-gray-100">{d.title}</Text>
                  </View>
                  <Text
                    style={{ fontVariant: ['tabular-nums'] }}
                    className={`text-xs ${dn === d.tasks.length ? 'font-bold text-ok dark:text-ok-dark' : 'text-gray-400'}`}
                  >
                    {dn}/{d.tasks.length}
                  </Text>
                </View>
                <Text className="mt-1 text-xs text-gray-400">{d.sub}</Text>
                {d.tasks.map(t => (
                  <View key={t.id} className="mt-3 flex-row items-center rounded-2xl bg-gray-50 p-3 dark:bg-white/5">
                    <ScaleButton
                      className={`h-11 w-11 items-center justify-center rounded-full border-2 ${
                        done[t.id] ? 'border-ok bg-ok' : 'border-gray-300 dark:border-white/20'
                      }`}
                      onPress={() => toggle(t.id)}
                    >
                      <Text className="text-base font-bold text-white">{done[t.id] ? '✓' : ''}</Text>
                    </ScaleButton>
                    <View className="ml-3 flex-1">
                      <View className="flex-row items-center justify-between">
                        <Text
                          className={`flex-1 text-sm font-medium ${
                            done[t.id]
                              ? 'text-gray-400 line-through dark:text-gray-500'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}
                          numberOfLines={1}
                        >
                          {t.label}
                        </Text>
                        <Text style={{ fontVariant: ['tabular-nums'] }} className="ml-2 text-xs text-gray-400">
                          约 {t.minutes} 分钟
                        </Text>
                      </View>
                      <Text className="mt-0.5 text-xs text-gray-400" numberOfLines={2}>
                        {t.desc}
                      </Text>
                    </View>
                    {!done[t.id] && (
                      <ScaleButton
                        className="ml-2 min-h-[44px] items-center justify-center rounded-xl bg-brand/10 px-3 dark:bg-brand-dark/15"
                        onPress={() => void go(t)}
                      >
                        <Text className="text-xs font-semibold text-brand dark:text-brand-dark">
                          {busy === t.id ? '开卷中…' : `${t.goText} ›`}
                        </Text>
                      </ScaleButton>
                    )}
                  </View>
                ))}
              </View>
            </Animated.View>
          )
        })}
      </ScrollView>
    </View>
  )
}
