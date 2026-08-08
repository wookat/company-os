import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AiGrade from '../components/AiGrade'
import ScaleButton from '../components/ScaleButton'
import { useToast } from '../components/Toast'
import { ApiError, SubjQ, api, getToken } from '../lib/api'
import { hapticSuccess } from '../lib/haptics'

const SUBJECTS = ['全部', '马原', '毛中特', '史纲', '思修', '形势与政策']
const CLOZE_KEY = 'zt_recite_cloze'
const BIGFONT_KEY = 'zt_subj_bigfont'

// 开头线索：到第一个逗号/顿号/冒号，或前 1/3
function cueOf(pt: string): string {
  const m = pt.match(/^.{4,24}?[，、：；,:]/)
  return m ? m[0] : pt.slice(0, Math.min(10, Math.max(4, Math.floor(pt.length / 3))))
}

export default function Recite() {
  const router = useRouter()
  const { toast } = useToast()
  const insets = useSafeAreaInsets()
  const [all, setAll] = useState<SubjQ[]>([])
  const [subject, setSubject] = useState('全部')
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [memoKeys, setMemoKeys] = useState<Set<string>>(new Set())
  const [dueKeys, setDueKeys] = useState<Set<string>>(new Set())
  const [hits, setHits] = useState<Record<string, number[]>>({})
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const [loading, setLoading] = useState(true)
  // 挖空自测：开启后每条要点只露开头线索，其余遮挡；全局持久
  const [cloze, setCloze] = useState(false)
  // 大字模式：字号+行高同步加大
  const [bigFont, setBigFont] = useState(false)

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    void AsyncStorage.getItem(CLOZE_KEY).then(v => setCloze(v === '1'))
    void AsyncStorage.getItem(BIGFONT_KEY).then(v => setBigFont(v === '1'))
    Promise.all([
      api.subjYears().then(async r => {
        const ys = (r.years ?? []).slice(0, 4).map(x => x.year)
        const packs = await Promise.all(ys.map(y => api.subjective(y).catch(() => null)))
        const qs: SubjQ[] = []
        for (const pk of packs) if (pk) qs.push(...pk.questions.map(q => ({ ...q, year: pk.year })))
        setAll(qs)
      }),
      api.subjMemo().then(r => {
        setMemoKeys(new Set(r.keys ?? []))
        setDueKeys(new Set(r.due ?? []))
        const h: Record<string, number[]> = {}
        for (const [k, v] of Object.entries(r.hits ?? {})) h[k] = v.sel ?? []
        setHits(h)
      })
    ])
      .catch(e => toast(e instanceof ApiError ? e.message : '加载失败'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleCloze = () => {
    const v = !cloze
    setCloze(v)
    setRevealed(new Set())
    void AsyncStorage.setItem(CLOZE_KEY, v ? '1' : '0')
  }
  const toggleBigFont = () => {
    const v = !bigFont
    setBigFont(v)
    void AsyncStorage.setItem(BIGFONT_KEY, v ? '1' : '0')
  }

  const list = useMemo(
    () => (subject === '全部' ? all : all.filter(q => (q.subject || '').startsWith(subject.slice(0, 2)))),
    [all, subject]
  )
  const q = list[idx % Math.max(1, list.length)]
  const key = q ? `${q.year}-${q.seq}` : ''
  const memorized = memoKeys.has(key)
  const dueList = all.filter(x => dueKeys.has(`${x.year}-${x.seq}`))

  const next = () => {
    setRevealed(new Set())
    setIdx(i => (i + 1) % Math.max(1, list.length))
  }

  // 逐条自评命中：展开后再点切换✓，防抖 300ms 同步 /api/subjmemo/hit（与 Web 互通）
  const togglePt = (pi: number) => {
    if (!q) return
    const total = q.answer_points.length
    setHits(prev => {
      const cur = prev[key] ?? []
      const sel = cur.includes(pi) ? cur.filter(x => x !== pi) : [...cur, pi]
      if (timers.current[key]) clearTimeout(timers.current[key])
      timers.current[key] = setTimeout(() => {
        void api.subjMemoHit(q.year, q.seq, sel.length, total, sel).catch(() => undefined)
      }, 300)
      return { ...prev, [key]: sel }
    })
  }

  const markMemorized = async () => {
    if (!q) return
    try {
      await api.subjMemoSet(q.year, q.seq, !memorized)
      const nk = new Set(memoKeys)
      if (memorized) nk.delete(key)
      else nk.add(key)
      setMemoKeys(nk)
      if (!memorized) {
        hapticSuccess()
        toast('已标记背会 ✓')
        next()
      }
    } catch (e) {
      toast(e instanceof ApiError ? e.message : '操作失败')
    }
  }

  const review = async () => {
    if (!dueList.length) return
    const t = dueList[0]
    const i = list.findIndex(x => x.year === t.year && x.seq === t.seq)
    if (i >= 0) {
      setIdx(i)
      setRevealed(new Set())
    }
    try {
      await api.subjMemoReview(t.year, t.seq)
      const nd = new Set(dueKeys)
      nd.delete(`${t.year}-${t.seq}`)
      setDueKeys(nd)
    } catch {
      /* 忽略 */
    }
  }

  const stemCls = bigFont ? 'text-xl leading-9' : 'text-base leading-7'
  const ptCls = bigFont ? 'text-lg leading-8' : 'text-sm leading-6'

  return (
    <View className="flex-1 bg-bgl dark:bg-bgd" style={{ paddingTop: insets.top + 8 }}>
      {/* 顶栏 */}
      <View className="flex-row items-center justify-between px-4 pb-2">
        <ScaleButton className="min-h-[44px] min-w-[44px] items-center justify-center" onPress={() => router.back()}>
          <Text className="text-2xl text-gray-500 dark:text-gray-400">‹</Text>
        </ScaleButton>
        <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">分析题背诵</Text>
        <ScaleButton
          className={`min-h-[44px] items-center justify-center rounded-xl px-3 ${
            bigFont ? 'bg-brand dark:bg-brand-dark' : 'bg-white dark:bg-cardd'
          }`}
          haptic={false}
          onPress={toggleBigFont}
        >
          <Text className={`text-xs font-medium ${bigFont ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
            A{bigFont ? '⁻' : '⁺'} 大字
          </Text>
        </ScaleButton>
      </View>

      {/* 科目筛选 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-h-[52px] px-4" contentContainerStyle={{ gap: 8 }}>
        {SUBJECTS.map(s => (
          <ScaleButton
            key={s}
            haptic={false}
            className={`min-h-[40px] items-center justify-center rounded-full px-4 ${
              subject === s ? 'bg-brand dark:bg-brand-dark' : 'bg-white dark:bg-cardd'
            }`}
            onPress={() => {
              setSubject(s)
              setIdx(0)
              setRevealed(new Set())
            }}
          >
            <Text className={`text-sm font-medium ${subject === s ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
              {s}
            </Text>
          </ScaleButton>
        ))}
      </ScrollView>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <Text className="mt-3 text-sm text-gray-400">加载分析题库…</Text>
        </View>
      ) : !q ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-gray-400">该科目暂无分析题</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
          <Animated.View key={key} entering={FadeInUp.duration(280)}>
            <View className="rounded-3xl bg-white p-5 shadow-sm dark:bg-cardd">
              <View className="flex-row flex-wrap items-center gap-2">
                <View className="rounded-full bg-rose/10 px-2.5 py-1">
                  <Text className="text-xs font-medium text-rose">分析题</Text>
                </View>
                <Text className="text-xs text-gray-400">
                  {q.year} 年 · 第 {q.seq} 题 · {q.subject}
                  {q.kp_name ? ` · ${q.kp_name}` : ''}
                </Text>
                {memorized && (
                  <View className="rounded-full bg-ok/15 px-2 py-0.5">
                    <Text className="text-[10px] font-bold text-ok dark:text-ok-dark">已背会</Text>
                  </View>
                )}
              </View>
              <Text className={`mt-3 text-gray-900 dark:text-gray-100 ${stemCls}`}>
                {q.stem.split(/\n?\(1\)/)[0].trim()}
              </Text>
              {q.questions.map((setq, i) => (
                <Text key={i} className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                  设问{q.questions.length > 1 ? i + 1 : ''}：{setq}
                </Text>
              ))}

              {/* 要点自评 + 挖空自测 */}
              <View className="mt-4 flex-row items-center justify-between">
                <Text className="flex-1 text-xs text-gray-400">
                  {cloze ? '挖空模式：凭开头线索回忆，点击揭开；揭开后再点自评「想到了」' : '参考要点（先想再看，点击展开；展开后再点自评「想到了」）'}
                  {(hits[key] ?? []).length > 0 ? ` · 想到 ${(hits[key] ?? []).length}/${q.answer_points.length}` : ''}
                </Text>
                <ScaleButton
                  haptic={false}
                  className={`ml-2 min-h-[36px] items-center justify-center rounded-full px-3 ${
                    cloze ? 'bg-warn' : 'bg-gray-100 dark:bg-white/10'
                  }`}
                  onPress={toggleCloze}
                >
                  <Text className={`text-xs font-medium ${cloze ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                    {cloze ? '✓ 挖空自测中' : '挖空自测'}
                  </Text>
                </ScaleButton>
              </View>
              {q.answer_points.map((pt, i) => {
                const on = revealed.has(i)
                const hit = (hits[key] ?? []).includes(i)
                return (
                  <ScaleButton
                    key={i}
                    haptic={false}
                    className={`mt-2 min-h-[44px] justify-center rounded-xl border-l-4 p-3 ${
                      on
                        ? hit
                          ? 'border-ok bg-ok/5'
                          : 'border-brand bg-brand/5 dark:border-brand-dark dark:bg-brand-dark/10'
                        : 'border-gray-300 bg-gray-50 dark:border-white/20 dark:bg-white/5'
                    }`}
                    onPress={() => {
                      if (!on) {
                        const s = new Set(revealed)
                        s.add(i)
                        setRevealed(s)
                      } else togglePt(i)
                    }}
                  >
                    {on ? (
                      <Text className={`text-gray-800 dark:text-gray-200 ${ptCls}`}>
                        {i + 1}. {pt}
                      </Text>
                    ) : cloze ? (
                      <Text className={`text-gray-500 dark:text-gray-400 ${ptCls}`}>
                        {i + 1}. 👁 {cueOf(pt)}
                        {'█'.repeat(Math.min(18, Math.max(4, pt.length - cueOf(pt).length)))}
                      </Text>
                    ) : (
                      <Text className={`text-gray-400 ${ptCls}`}>
                        {i + 1}. {'█'.repeat(Math.min(24, Math.max(8, pt.length)))}
                      </Text>
                    )}
                    {on && (
                      <Text className={`mt-1 text-xs ${hit ? 'text-ok dark:text-ok-dark' : 'text-gray-400'}`}>
                        {hit ? '✓ 想到了' : '点我自评命中'}
                      </Text>
                    )}
                  </ScaleButton>
                )
              })}

              <AiGrade key={key} year={q.year} seq={q.seq} points={q.answer_points} />

              <View className="mt-5 flex-row gap-3">
                <ScaleButton
                  className={`min-h-[50px] flex-[2] items-center justify-center rounded-2xl ${
                    memorized ? 'bg-gray-100 dark:bg-white/10' : 'bg-ok'
                  }`}
                  onPress={() => void markMemorized()}
                >
                  <Text className={`text-base font-semibold ${memorized ? 'text-gray-600 dark:text-gray-300' : 'text-white'}`}>
                    {memorized ? '取消背会标记' : '✓ 背会了'}
                  </Text>
                </ScaleButton>
                <ScaleButton
                  className="min-h-[50px] flex-1 items-center justify-center rounded-2xl bg-white dark:bg-cardd"
                  onPress={next}
                >
                  <Text className="text-base font-medium text-gray-700 dark:text-gray-300">下一题</Text>
                </ScaleButton>
              </View>
            </View>
          </Animated.View>

          <Text style={{ fontVariant: ['tabular-nums'] }} className="mt-3 text-center text-xs text-gray-400">
            已背会 {memoKeys.size}/{all.length || '…'} · 第 {list.length ? (idx % list.length) + 1 : 0}/{list.length} 题
          </Text>

          {dueList.length > 0 && (
            <View className="mt-3 flex-row items-center justify-between rounded-2xl bg-warn/10 p-4">
              <Text className="flex-1 text-sm text-gray-800 dark:text-gray-200">
                🔁 温习：{dueList.length} 道背会超 7 天的题待温习
              </Text>
              <ScaleButton
                className="ml-2 min-h-[40px] items-center justify-center rounded-xl bg-warn px-4"
                onPress={() => void review()}
              >
                <Text className="text-sm font-semibold text-white">去温习</Text>
              </ScaleButton>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  )
}
