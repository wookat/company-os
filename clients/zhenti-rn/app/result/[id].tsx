import AsyncStorage from '@react-native-async-storage/async-storage'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AiGrade from '../../components/AiGrade'
import ScaleButton from '../../components/ScaleButton'
import { useToast } from '../../components/Toast'
import { ApiError, PaperResult, ResultDetail, api } from '../../lib/api'
import { useTheme } from '../../lib/theme'

/** 全真模考分析题：作答回显 + 逐要点自评（防抖 300ms 同步 essay-self）+ AI 批改 */
function MockEssay({
  pid,
  x,
  mockYear,
  yourText,
  stemCls
}: {
  pid: number
  x: ResultDetail
  mockYear: number
  yourText: string
  stemCls: string
}) {
  const points = (x.answer || '').split('\n').filter(Boolean)
  const [sel, setSel] = useState<Set<number>>(() => new Set(x.self ?? []))
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const togglePt = (pi: number) => {
    setSel(prev => {
      const n = new Set(prev)
      if (n.has(pi)) n.delete(pi)
      else n.add(pi)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        void api.essaySelf(pid, x.id, [...n]).catch(() => undefined)
      }, 300)
      return n
    })
  }
  return (
    <View className="mt-4 rounded-2xl bg-gray-50 p-4 dark:bg-white/5">
      <View className="flex-row items-center">
        <View className="rounded-full bg-warn/15 px-2 py-0.5">
          <Text className="text-xs font-bold text-warn">分析题 第 {x.seq} 题</Text>
        </View>
        <Text className="ml-2 flex-1 text-xs text-gray-400" numberOfLines={1}>
          {x.knowledge_point || '—'}
        </Text>
      </View>
      <Text className={`mt-2 text-gray-900 dark:text-gray-100 ${stemCls}`}>{x.stem}</Text>
      <View className="mt-3 rounded-xl bg-white p-3 dark:bg-cardd">
        <Text className="text-xs text-gray-400">你的作答</Text>
        <Text className="mt-1 text-sm leading-6 text-gray-800 dark:text-gray-200">{yourText || '（未作答）'}</Text>
      </View>
      <Text className="mt-3 text-xs text-gray-400">
        参考要点（点击要点自评命中，已命中 {sel.size}/{points.length}）
      </Text>
      {points.map((pt, pi) => (
        <ScaleButton
          key={pi}
          haptic={false}
          className={`mt-2 min-h-[44px] justify-center rounded-xl border-l-4 p-3 ${
            sel.has(pi) ? 'border-ok bg-ok/5' : 'border-gray-300 bg-white dark:border-white/20 dark:bg-cardd'
          }`}
          onPress={() => togglePt(pi)}
        >
          <Text className="text-sm leading-6 text-gray-800 dark:text-gray-200">
            {sel.has(pi) ? '✓' : '○'} {pi + 1}. {pt}
          </Text>
        </ScaleButton>
      ))}
      {!!x.analysis && <Text className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">解析：{x.analysis}</Text>}
      <AiGrade year={mockYear} seq={x.seq} points={points} initialText={yourText} />
    </View>
  )
}

export default function Result() {
  const router = useRouter()
  const { toast } = useToast()
  const insets = useSafeAreaInsets()
  const { bigFont } = useTheme()
  const params = useLocalSearchParams<{ id: string }>()
  const paperId = parseInt(params.id ?? '0', 10)
  const [data, setData] = useState<PaperResult | null>(null)
  const [shownRate, setShownRate] = useState(0)
  const [kpOpen, setKpOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!paperId) return
    api.result(paperId)
      .then(setData)
      .catch(e => toast(e instanceof ApiError ? e.message : '加载失败'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperId])

  const rate = data && data.total > 0 ? Math.round((data.score / data.total) * 100) : 0

  // 得分滚动动效（easeOutCubic）
  useEffect(() => {
    if (!data) return
    if (rate <= 0) {
      setShownRate(0)
      return
    }
    const ms = 900
    const t0 = Date.now()
    const t = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / ms)
      setShownRate(Math.round(rate * (1 - Math.pow(1 - p, 3))))
      if (p >= 1) clearInterval(t)
    }, 16)
    return () => clearInterval(t)
  }, [data, rate])

  const kpAgg = useMemo(() => {
    const map: Record<string, { total: number; correct: number }> = {}
    for (const d of data?.detail ?? []) {
      if (d.correct == null) continue
      const kp = d.knowledge_point || '其他'
      map[kp] = map[kp] ?? { total: 0, correct: 0 }
      map[kp].total++
      if (d.correct) map[kp].correct++
    }
    return Object.entries(map)
      .map(([kp, v]) => ({ kp, ...v, r: Math.round((v.correct / v.total) * 100) }))
      .sort((a, b) => a.r - b.r)
  }, [data])

  const wrongs = useMemo(() => (data?.detail ?? []).filter(d => d.correct === false), [data])

  // 全真模考：分析题自评/AI 批改 + 客观题按单选 1 分/多选 2 分计分（50 分制口径）
  const isMock = /全真模考/.test(data?.title ?? '')
  const mockYear = parseInt((data?.title ?? '').match(/(20\d{2})/)?.[1] ?? '0', 10)
  const essays = useMemo(
    () => (isMock ? (data?.detail ?? []).filter(d => d.qtype === 'essay') : []),
    [data, isMock]
  )
  const mockObj = useMemo(() => {
    if (!isMock) return null
    let score = 0
    let total = 0
    for (const d of data?.detail ?? []) {
      if (d.correct == null || d.qtype === 'essay') continue
      const w = d.qtype === 'multi' ? 2 : 1
      total += w
      if (d.correct) score += w
    }
    return { score, total }
  }, [data, isMock])

  // 分析题本地作答回显（zt_essay_<pid>，答题页暂存）
  const [essayLocal, setEssayLocal] = useState<Record<number, string>>({})
  useEffect(() => {
    if (!paperId) return
    void AsyncStorage.getItem(`zt_essay_${paperId}`)
      .then(raw => {
        if (raw) setEssayLocal(JSON.parse(raw) as Record<number, string>)
      })
      .catch(() => undefined)
  }, [paperId])

  if (!data) {
    return (
      <View className="flex-1 items-center justify-center bg-bgl dark:bg-bgd">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  const ringColor = rate < 40 ? '#F43F5E' : rate <= 70 ? '#F59E0B' : '#00B578'
  const mm = Math.floor((data.duration_sec ?? 0) / 60)
  const ss = (data.duration_sec ?? 0) % 60
  const weakN = kpAgg.filter(k => k.r < 70).length
  const grade =
    rate >= 85
      ? '冲刺状态拉满，保持节奏'
      : rate >= 60
        ? `基础稳固，重点攻克 ${weakN} 个薄弱考点`
        : `打基础期，锁定 ${weakN} 个薄弱考点逐个拿下`
  const showBeat = rate >= 40 && typeof data.beat_pct === 'number' && data.beat_pct >= 20
  const kpShown = kpOpen ? kpAgg : kpAgg.slice(0, 5)
  const stemCls = bigFont ? 'text-lg leading-8' : 'text-sm leading-6'
  const anaCls = bigFont ? 'text-base leading-7' : 'text-xs leading-5'

  const goWeak = async () => {
    const weak = kpAgg.filter(k => k.r < 70).map(k => k.kp).slice(0, 3)
    if (!weak.length) return toast('本卷没有薄弱考点，继续保持！')
    if (busy) return
    setBusy(true)
    try {
      const r = await api.realWeak(weak)
      router.replace(`/exam/${r.id}`)
    } catch (e) {
      toast(e instanceof ApiError ? e.message : '组卷失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-bgl dark:bg-bgd"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: 16 }}
    >
      {/* 得分卡 */}
      <Animated.View entering={FadeInUp.duration(350)}>
        <View className="items-center rounded-3xl bg-white p-6 shadow-sm dark:bg-cardd">
          <View
            className="h-36 w-36 items-center justify-center rounded-full border-8"
            style={{ borderColor: ringColor }}
          >
            <Text style={{ fontVariant: ['tabular-nums'], color: ringColor }} className="text-4xl font-bold">
              {shownRate}
            </Text>
            <Text className="text-xs text-gray-400">得分率 %</Text>
          </View>
          <Text className="mt-4 text-base font-semibold text-gray-900 dark:text-gray-100">
            {data.title ?? '真题卷'}
            {isMock ? ` · 客观题 ${data.total} 道 + ${essays.length} 道分析题` : ''}
          </Text>
          <Text style={{ fontVariant: ['tabular-nums'] }} className="mt-1 text-xs text-gray-400">
            {mockObj ? `客观题得分 ${mockObj.score}/${mockObj.total}（单选 1 分/多选 2 分） · ` : ''}
            答对 {data.score}/{data.total} · 用时 {mm}:{String(ss).padStart(2, '0')}
            {showBeat ? ` · 击败 ${data.beat_pct}% 研友` : ''}
          </Text>
          {!showBeat && <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">{grade}</Text>}
          <View className="mt-5 w-full flex-row gap-3">
            <ScaleButton
              className="min-h-[46px] flex-1 items-center justify-center rounded-2xl bg-gray-100 dark:bg-white/10"
              onPress={() => router.replace('/(tabs)')}
            >
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">回工作台</Text>
            </ScaleButton>
            <ScaleButton
              className="min-h-[46px] flex-1 items-center justify-center rounded-2xl bg-rose"
              onPress={() =>
                wrongs.length ? router.replace('/(tabs)/wrong') : toast('本卷全对，无错题')
              }
            >
              <Text className="text-sm font-semibold text-white">错题重练 {wrongs.length}</Text>
            </ScaleButton>
          </View>
        </View>
      </Animated.View>

      {/* 考点分布 */}
      {kpAgg.length > 0 && (
        <Animated.View entering={FadeInUp.delay(100).duration(350)}>
          <View className="mt-4 rounded-3xl bg-white p-5 shadow-sm dark:bg-cardd">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">考点分布</Text>
              <ScaleButton className="min-h-[44px] justify-center px-2" haptic={false} onPress={() => void goWeak()}>
                <Text className="text-xs font-medium text-brand dark:text-brand-dark">弱项补练 ›</Text>
              </ScaleButton>
            </View>
            {kpShown.map(k => {
              const barCls = k.r < 50 ? 'bg-rose' : k.r < 70 ? 'bg-warn' : 'bg-ok'
              return (
                <View key={k.kp} className="mt-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="flex-1 text-sm text-gray-800 dark:text-gray-200" numberOfLines={1}>
                      {k.kp}
                    </Text>
                    <Text style={{ fontVariant: ['tabular-nums'] }} className="ml-2 text-xs text-gray-400">
                      {k.correct}/{k.total}
                    </Text>
                  </View>
                  <View className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                    <View className={`h-full rounded-full ${barCls}`} style={{ width: `${k.r}%` }} />
                  </View>
                </View>
              )
            })}
            {!kpOpen && kpAgg.length > 5 && (
              <ScaleButton className="mt-3 min-h-[44px] items-center justify-center" haptic={false} onPress={() => setKpOpen(true)}>
                <Text className="text-xs text-gray-400">展开全部 {kpAgg.length} 个考点 ▾</Text>
              </ScaleButton>
            )}
          </View>
        </Animated.View>
      )}

      {/* 全真模考：分析题作答回显 + 逐要点自评 + AI 批改 */}
      {essays.length > 0 && (
        <Animated.View entering={FadeInUp.delay(150).duration(350)}>
          <View className="mt-4 rounded-3xl bg-white p-5 shadow-sm dark:bg-cardd">
            <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">分析题自评</Text>
            {essays.map(x => (
              <MockEssay
                key={x.id}
                pid={paperId}
                x={x}
                mockYear={mockYear}
                yourText={essayLocal[x.id] || x.your || ''}
                stemCls={stemCls}
              />
            ))}
          </View>
        </Animated.View>
      )}

      {/* 逐题解析 */}
      <Animated.View entering={FadeInUp.delay(200).duration(350)}>
        <View className="mt-4 rounded-3xl bg-white p-5 shadow-sm dark:bg-cardd">
          <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">逐题解析</Text>
          {(data.detail ?? []).map((d: ResultDetail) =>
            d.correct == null ? null : (
              <View
                key={d.id}
                className={`mt-4 rounded-2xl border-l-4 bg-gray-50 p-4 dark:bg-white/5 ${
                  d.correct ? 'border-ok' : 'border-rose'
                }`}
              >
                <View className="flex-row items-center">
                  <View className={`rounded-full px-2 py-0.5 ${d.correct ? 'bg-ok/15' : 'bg-rose/15'}`}>
                    <Text className={`text-xs font-bold ${d.correct ? 'text-ok dark:text-ok-dark' : 'text-rose'}`}>
                      {d.correct ? '✓' : '✗'} 第 {d.seq} 题
                    </Text>
                  </View>
                  <Text className="ml-2 flex-1 text-xs text-gray-400" numberOfLines={1}>
                    {d.qtype === 'multi' ? '多选' : '单选'} · {d.knowledge_point || '—'}
                  </Text>
                </View>
                <Text className={`mt-2 text-gray-900 dark:text-gray-100 ${stemCls}`}>{d.stem}</Text>
                <Text className="mt-2 text-xs">
                  <Text className="text-rose">你的答案 {d.your || '未作答'}</Text>
                  <Text className="text-gray-400"> · </Text>
                  <Text className="text-ok dark:text-ok-dark">正确答案 {d.answer}</Text>
                </Text>
                {!!d.analysis && (
                  <Text className={`mt-2 text-gray-500 dark:text-gray-400 ${anaCls}`}>解析：{d.analysis}</Text>
                )}
              </View>
            )
          )}
        </View>
      </Animated.View>
    </ScrollView>
  )
}
