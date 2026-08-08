import AsyncStorage from '@react-native-async-storage/async-storage'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native'
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
  const essayKey = `zt_essay_${paperId}`

  const [qs, setQs] = useState<Question[]>([])
  const [title, setTitle] = useState('')
  const [cur, setCur] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [sec, setSec] = useState(0)
  const [gen, setGen] = useState(false)
  const [autoNext, setAutoNext] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // 全真模考：保留分析题，强制 180 分钟倒计时，到时自动交卷
  const [isMock, setIsMock] = useState(false)
  const startRef = useRef(Date.now())
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timeUpRef = useRef(false)
  const TIME_LIMIT = 180 * 60

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
          const mock = /全真模考/.test(r.paper.title ?? '')
          setIsMock(mock)
          setQs(mock ? (r.questions ?? []) : (r.questions ?? []).filter(q => (q.qtype || 'single') !== 'essay'))
          try {
            const raw = await AsyncStorage.getItem(draftKey)
            if (raw) {
              const d = JSON.parse(raw) as { answers?: Record<number, string>; cur?: number; sec?: number }
              if ((d.answers && Object.keys(d.answers).length) || d.sec) {
                setAnswers(d.answers ?? {})
                setCur(d.cur ?? 0)
                startRef.current = Date.now() - (d.sec ?? 0) * 1000
                const n = Object.values(d.answers ?? {}).filter(Boolean).length
                if (n) toast(`已恢复上次作答（${n} 题）`)
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

  // 已用时单调不减：以本地已存最大值为准，防退出重进倒带变相延时
  const persistDraft = useCallback(async () => {
    if (!paperId || !qs.length) return
    try {
      const raw = await AsyncStorage.getItem(draftKey)
      const prevSec = raw ? ((JSON.parse(raw) as { sec?: number }).sec ?? 0) : 0
      const nowSec = Math.max(prevSec, Math.floor((Date.now() - startRef.current) / 1000))
      await AsyncStorage.setItem(draftKey, JSON.stringify({ answers, cur, sec: nowSec }))
    } catch {
      /* 忽略 */
    }
  }, [paperId, qs.length, answers, cur, draftKey])

  // 分析题作答本地暂存（zt_essay_<pid>，成绩页回显用）
  const persistEssays = useCallback(
    async (a: Record<number, string>) => {
      if (!isMock || !qs.length) return
      try {
        const essays: Record<number, string> = {}
        for (const x of qs) if (x.qtype === 'essay' && (a[x.id] || '').trim()) essays[x.id] = a[x.id]
        await AsyncStorage.setItem(essayKey, JSON.stringify(essays))
      } catch {
        /* 忽略 */
      }
    },
    [isMock, qs, essayKey]
  )

  useEffect(() => {
    if (!answeredCount || !qs.length) return
    void persistDraft()
    void persistEssays(answers)
  }, [answers, cur, qs.length, answeredCount, persistDraft, persistEssays])

  // 模考期间每 10s 周期持久化已用时
  useEffect(() => {
    if (!isMock || !qs.length) return
    const t = setInterval(() => void persistDraft(), 10000)
    return () => clearInterval(t)
  }, [isMock, qs.length, persistDraft])

  const pick = (letter: string) => {
    if (!q || q.qtype === 'essay') return
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

  const doSubmit = useCallback(async (force = false) => {
    if (submitting) return
    setSubmitting(true)
    try {
      await persistEssays(answers)
      const payload: Record<string, string> = {}
      for (const [k, v] of Object.entries(answers)) if ((v || '').trim()) payload[k] = v
      const dur = force && timeUpRef.current ? TIME_LIMIT : Math.floor((Date.now() - startRef.current) / 1000)
      await api.submit(paperId, payload, dur)
      await AsyncStorage.removeItem(draftKey)
      hapticSuccess()
      router.replace(`/result/${paperId}`)
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        await AsyncStorage.removeItem(draftKey)
        router.replace(`/result/${paperId}`)
        return
      }
      timeUpRef.current = false
      toast(e instanceof ApiError ? e.message : '交卷失败，请重试')
      setSubmitting(false)
    }
  }, [answers, paperId, draftKey, router, submitting, toast, persistEssays, TIME_LIMIT])

  // 模考倒计时：剩 5 分钟变红，到时自动交卷（仅触发一次）
  const remain = isMock ? Math.max(0, TIME_LIMIT - sec) : 0
  useEffect(() => {
    if (!isMock || !qs.length || remain > 0 || timeUpRef.current) return
    timeUpRef.current = true
    toast('时间到，已自动交卷')
    void doSubmit(true)
  }, [isMock, qs.length, remain, doSubmit, toast])

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
    const singleMulti = qs.filter(x => x.qtype === 'multi' && (answers[x.id] ?? '').length === 1).length
    if (singleMulti > 0) {
      Alert.alert('确认交卷？', `有 ${singleMulti} 道多选题只选了 1 项（多选题至少 2 项，漏选不得分），确定交卷？`, [
        { text: '回去检查', style: 'cancel' },
        { text: '确定交卷', onPress: () => void doSubmit() }
      ])
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
  const isEssay = q.qtype === 'essay'
  const opts = [q.opt_a, q.opt_b, q.opt_c, q.opt_d]
  const clockSec = isMock ? remain : sec
  const timeWarn = isMock && remain <= 300
  // 多选题「确认」按钮：选满 2 项才可确认本题（Feature 1）
  const multiOk = isMulti && myAns.length >= 2
  const isLast = cur === qs.length - 1

  const goNext = () => {
    hapticLight()
    if (isLast) confirmSubmit()
    else setCur(c => Math.min(qs.length - 1, c + 1))
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bgl dark:bg-bgd"
      style={{ paddingTop: insets.top + 8 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
        <Text
          style={{ fontVariant: ['tabular-nums'] }}
          className={`text-base font-medium ${
            timeWarn ? 'text-rose' : isMock ? 'text-brand dark:text-brand-dark' : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          {isMock ? `⏱ 剩 ${fmt(clockSec)}` : fmt(clockSec)}
        </Text>
        {isMock ? (
          <View className="min-w-[44px] items-end">
            <Text className="text-xs text-gray-400">全真模考</Text>
          </View>
        ) : (
          <View className="flex-row items-center">
            <Text className="mr-1 text-xs text-gray-400">自动下一题</Text>
            <Switch value={autoNext} onValueChange={toggleAutoNext} trackColor={{ true: pal.brand }} />
          </View>
        )}
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
            <View
              className={`rounded-full px-2.5 py-1 ${
                isMulti ? 'bg-warn/15' : isEssay ? 'bg-rose/10' : 'bg-brand/10 dark:bg-brand-dark/15'
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  isMulti ? 'text-warn' : isEssay ? 'text-rose' : 'text-brand dark:text-brand-dark'
                }`}
              >
                {isMulti ? '多选题' : isEssay ? '分析题' : '单选题'}
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

          {isEssay ? (
            <View className="mt-5">
              <TextInput
                multiline
                maxLength={3000}
                value={myAns}
                onChangeText={v => {
                  setAnswers(prev => {
                    const next = { ...prev }
                    if (v.trim()) next[q.id] = v.slice(0, 3000)
                    else delete next[q.id]
                    return next
                  })
                }}
                placeholder="像考场一样把答案写出来（自动保存防丢，交卷后可对照参考要点自评或交给 AI 批改）…"
                placeholderTextColor={pal.text3}
                textAlignVertical="top"
                className="min-h-[220px] rounded-2xl bg-white p-4 text-base leading-6 text-gray-900 dark:bg-cardd dark:text-gray-100"
              />
              <Text style={{ fontVariant: ['tabular-nums'] }} className="mt-2 text-xs text-gray-400">
                已写 {myAns.length}/3000 字 · 不计入客观题得分，交卷后在成绩页逐要点自评/AI 批改
              </Text>
            </View>
          ) : (
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
          )}
          {isMulti && (
            <Text className="mt-3 text-xs text-gray-400">
              多选题：至少选 2 项，选好后点「确认本题」{isLast ? '交卷' : '进入下一题'}
            </Text>
          )}
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
        {isMulti ? (
          /* 多选题「确认本题」：选满 2 项才亮起（Feature 1） */
          <ScaleButton
            className={`min-h-[50px] flex-1 items-center justify-center rounded-2xl ${
              multiOk ? 'bg-brand dark:bg-brand-dark' : 'bg-gray-300 dark:bg-white/10'
            }`}
            disabled={!multiOk}
            onPress={goNext}
          >
            <Text className={`text-base font-semibold ${multiOk ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
              {multiOk ? (isLast ? '确认并交卷' : '确认本题') : `已选 ${myAns.length}/至少 2 项`}
            </Text>
          </ScaleButton>
        ) : !isLast ? (
          <ScaleButton
            className="min-h-[50px] flex-1 items-center justify-center rounded-2xl bg-brand dark:bg-brand-dark"
            onPress={goNext}
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
    </KeyboardAvoidingView>
  )
}

function fmt(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
