import AsyncStorage from '@react-native-async-storage/async-storage'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, Switch, Text, View } from 'react-native'
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ScaleButton from '../../components/ScaleButton'
import { useToast } from '../../components/Toast'
import { ApiError, Question, api } from '../../lib/api'
import { hapticLight, hapticSuccess } from '../../lib/haptics'
import { usePalette } from '../../lib/theme'

const AUTONEXT_KEY = 'zt_autonext'
const LETTERS = ['A', 'B', 'C', 'D'] as const

export default function Exam() {
  const router = useRouter()
  const { toast } = useToast()
  const pal = usePalette()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ id: string }>()
  const paperId = parseInt(params.id ?? '0', 10)
  const draftKey = `zt_exam_draft:${paperId}`

  const [qs, setQs] = useState<Question[]>([])
  const [title, setTitle] = useState('')
  const [cur, setCur] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [sec, setSec] = useState(0)
  const [gen, setGen] = useState(false)
  const [autoNext, setAutoNext] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const startRef = useRef(Date.now())
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!paperId) return
    let alive = true
    let timer: ReturnType<typeof setTimeout> | null = null
    void AsyncStorage.getItem(AUTONEXT_KEY).then(v => setAutoNext(v === '1'))
    const load = () => {
      api.paper(paperId)
        .then(async r => {
          if (!alive) return
          if (r.paper.status === 'failed') {
            toast(r.paper.fail_reason ?? '试卷生成失败')
            setTimeout(() => router.back(), 1500)
            return
          }
          if (r.paper.status !== 'ready') {
            setGen(true)
            timer = setTimeout(load, 5000)
            return
          }
          setGen(false)
          setTitle(r.paper.title ?? '')
          startRef.current = Date.now()
          setQs((r.questions ?? []).filter(q => (q.qtype || 'single') !== 'essay'))
          try {
            const raw = await AsyncStorage.getItem(draftKey)
            if (raw) {
              const d = JSON.parse(raw) as { answers?: Record<number, string>; cur?: number; sec?: number }
              if (d.answers && Object.keys(d.answers).length) {
                setAnswers(d.answers)
                setCur(d.cur ?? 0)
                startRef.current = Date.now() - (d.sec ?? 0) * 1000
                toast(`已恢复上次作答（${Object.values(d.answers).filter(Boolean).length} 题）`)
              }
            }
          } catch {
            /* draft 解析失败忽略 */
          }
        })
        .catch(e => toast(e instanceof ApiError ? e.message : '加载失败'))
    }
    load()
    const t = setInterval(() => setSec(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    return () => {
      alive = false
      if (timer) clearTimeout(timer)
      clearInterval(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperId])

  const q = qs[cur]
  const answeredCount = useMemo(() => Object.values(answers).filter(v => (v || '').trim()).length, [answers])

  useEffect(() => {
    if (!answeredCount || !qs.length) return
    const nowSec = Math.floor((Date.now() - startRef.current) / 1000)
    void AsyncStorage.setItem(draftKey, JSON.stringify({ answers, cur, sec: nowSec }))
  }, [answers, cur, qs.length, answeredCount, draftKey])

  const pick = (letter: string) => {
    if (!q) return
    hapticLight()
    const isMulti = q.qtype === 'multi'
    setAnswers(prev => {
      const curAns = prev[q.id] ?? ''
      const next = isMulti
        ? curAns.includes(letter)
          ? curAns.split('').filter(c => c !== letter).join('')
          : [...curAns.split(''), letter].sort().join('')
        : letter
      return { ...prev, [q.id]: next }
    })
    if (!isMulti && autoNext && cur < qs.length - 1) {
      if (autoTimer.current) clearTimeout(autoTimer.current)
      autoTimer.current = setTimeout(() => setCur(c => (c === cur ? c + 1 : c)), 350)
    }
  }

  useEffect(() => () => {
    if (autoTimer.current) clearTimeout(autoTimer.current)
  }, [])

  const toggleAutoNext = (v: boolean) => {
    setAutoNext(v)
    void AsyncStorage.setItem(AUTONEXT_KEY, v ? '1' : '0')
  }

  const doSubmit = useCallback(async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const payload: Record<string, string> = {}
      for (const [k, v] of Object.entries(answers)) if ((v || '').trim()) payload[k] = v
      await api.submit(paperId, payload, Math.floor((Date.now() - startRef.current) / 1000))
      await AsyncStorage.removeItem(draftKey)
      hapticSuccess()
      router.replace(`/result/${paperId}`)
    } catch (e) {
      toast(e instanceof ApiError ? e.message : '交卷失败，请重试')
      setSubmitting(false)
    }
  }, [answers, paperId, draftKey, router, submitting, toast])

  const confirmSubmit = () => {
    const unanswered = qs.map((x, i) => ((answers[x.id] ?? '').trim() ? -1 : i)).filter(v => v >= 0)
    if (unanswered.length > 0) {
      const nums = unanswered.slice(0, 10).map(v => `第${v + 1}题`).join('、')
      Alert.alert(
        '确认交卷？',
        `还有 ${unanswered.length} 题未作答（${nums}${unanswered.length > 10 ? ' 等' : ''}）。未作答题目计为错误但不进错题本。`,
        [
          { text: '去补答', onPress: () => setCur(unanswered[0]) },
          { text: '仍要交卷', style: 'destructive', onPress: () => void doSubmit() }
        ]
      )
      return
    }
    Alert.alert('确认交卷？', `共 ${qs.length} 题已全部作答，用时 ${fmt(sec)}。`, [
      { text: '再检查下', style: 'cancel' },
      { text: '交卷', onPress: () => void doSubmit() }
    ])
  }

  if (gen || !q) {
    return (
      <View className="flex-1 items-center justify-center bg-bgl dark:bg-bgd">
        <ActivityIndicator size="large" color={pal.brand} />
        <Text className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {gen ? 'AI 正在出卷，请稍候…' : '加载中…'}
        </Text>
      </View>
    )
  }

  const myAns = answers[q.id] ?? ''
  const isMulti = q.qtype === 'multi'
  const opts = [q.opt_a, q.opt_b, q.opt_c, q.opt_d]

  return (
    <View className="flex-1 bg-bgl dark:bg-bgd" style={{ paddingTop: insets.top + 8 }}>
      {/* 顶栏 */}
      <View className="flex-row items-center justify-between px-4 pb-2">
        <ScaleButton
          className="min-h-[44px] min-w-[44px] items-center justify-center"
          onPress={() => {
            if (answeredCount > 0) {
              Alert.alert('退出答题？', '作答已本地暂存，重新进入本卷可继续作答。', [
                { text: '继续答题', style: 'cancel' },
                { text: '退出', onPress: () => router.back() }
              ])
            } else router.back()
          }}
        >
          <Text className="text-2xl text-gray-500 dark:text-gray-400">✕</Text>
        </ScaleButton>
        <Text style={{ fontVariant: ['tabular-nums'] }} className="text-base font-medium text-gray-700 dark:text-gray-300">
          {fmt(sec)}
        </Text>
        <View className="flex-row items-center">
          <Text className="mr-1 text-xs text-gray-400">自动下一题</Text>
          <Switch value={autoNext} onValueChange={toggleAutoNext} trackColor={{ true: pal.brand }} />
        </View>
      </View>

      {/* 进度条 */}
      <View className="mx-4 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
        <View
          className="h-full rounded-full bg-brand dark:bg-brand-dark"
          style={{ width: `${((cur + 1) / qs.length) * 100}%` }}
        />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <Animated.View key={q.id} entering={FadeInRight.duration(220)}>
          <View className="flex-row items-center">
            <View className={`rounded-full px-2.5 py-1 ${isMulti ? 'bg-warn/15' : 'bg-brand/10 dark:bg-brand-dark/15'}`}>
              <Text className={`text-xs font-medium ${isMulti ? 'text-warn' : 'text-brand dark:text-brand-dark'}`}>
                {isMulti ? '多选题' : '单选题'}
              </Text>
            </View>
            <Text style={{ fontVariant: ['tabular-nums'] }} className="ml-2 text-xs text-gray-400">
              {cur + 1} / {qs.length}
            </Text>
            {!!q.knowledge_point && (
              <Text className="ml-2 flex-1 text-xs text-gray-400" numberOfLines={1}>
                {q.knowledge_point}
              </Text>
            )}
          </View>
          <Text className="mt-3 text-lg leading-7 text-gray-900 dark:text-gray-100">{q.stem}</Text>

          <View className="mt-5 gap-3">
            {LETTERS.map((L, i) => {
              const selected = myAns.includes(L)
              return (
                <ScaleButton
                  key={L}
                  haptic={false}
                  scaleTo={0.97}
                  className={`min-h-[52px] flex-row items-center rounded-2xl border-2 px-4 py-3.5 ${
                    selected
                      ? 'border-brand bg-brand/5 dark:border-brand-dark dark:bg-brand-dark/10'
                      : 'border-transparent bg-white dark:bg-cardd'
                  }`}
                  onPress={() => pick(L)}
                >
                  <View
                    className={`h-7 w-7 items-center justify-center rounded-full ${
                      selected ? 'bg-brand dark:bg-brand-dark' : 'bg-gray-100 dark:bg-white/10'
                    }`}
                  >
                    <Text className={`text-sm font-bold ${selected ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                      {L}
                    </Text>
                  </View>
                  <Text className="ml-3 flex-1 text-base leading-6 text-gray-800 dark:text-gray-200">{opts[i]}</Text>
                </ScaleButton>
              )
            })}
          </View>
          {isMulti && <Text className="mt-3 text-xs text-gray-400">多选题：选齐后点「下一题」或「交卷」</Text>}
        </Animated.View>
      </ScrollView>

      {/* 底栏 */}
      <Animated.View entering={FadeIn} className="flex-row gap-3 px-4 pb-2" style={{ paddingBottom: insets.bottom + 12 }}>
        <ScaleButton
          className={`min-h-[50px] flex-1 items-center justify-center rounded-2xl bg-white dark:bg-cardd ${cur === 0 ? 'opacity-40' : ''}`}
          disabled={cur === 0}
          onPress={() => setCur(c => Math.max(0, c - 1))}
        >
          <Text className="text-base font-medium text-gray-700 dark:text-gray-300">上一题</Text>
        </ScaleButton>
        {cur < qs.length - 1 ? (
          <ScaleButton
            className="min-h-[50px] flex-1 items-center justify-center rounded-2xl bg-brand dark:bg-brand-dark"
            onPress={() => setCur(c => Math.min(qs.length - 1, c + 1))}
          >
            <Text className="text-base font-semibold text-white">下一题</Text>
          </ScaleButton>
        ) : (
          <ScaleButton
            className="min-h-[50px] flex-1 items-center justify-center rounded-2xl bg-ok"
            onPress={confirmSubmit}
            disabled={submitting}
          >
            <Text className="text-base font-semibold text-white">{submitting ? '交卷中…' : `交卷（${answeredCount}/${qs.length}）`}</Text>
          </ScaleButton>
        )}
      </Animated.View>
    </View>
  )
}

function fmt(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
