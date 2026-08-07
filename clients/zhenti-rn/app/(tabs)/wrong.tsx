import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ScaleButton from '../../components/ScaleButton'
import { useToast } from '../../components/Toast'
import { WrongQuestion, api, getToken } from '../../lib/api'
import { hapticError, hapticSuccess } from '../../lib/haptics'

const LETTERS = ['A', 'B', 'C', 'D'] as const

type Prac = { qs: WrongQuestion[]; i: number; right: number; grad: number; done: boolean }

export default function Wrong() {
  const router = useRouter()
  const { toast } = useToast()
  const insets = useSafeAreaInsets()
  const [list, setList] = useState<WrongQuestion[]>([])
  const [tab, setTab] = useState<'due' | 'all'>('due')
  const [loading, setLoading] = useState(true)
  const [prac, setPrac] = useState<Prac | null>(null)
  const [pracAns, setPracAns] = useState('')
  const [pracJudged, setPracJudged] = useState<boolean | null>(null)
  const [pracFb, setPracFb] = useState('')

  const load = useCallback(() => {
    api.wrongbook()
      .then(r => setList(r.questions ?? []))
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (!getToken()) {
        router.replace('/login')
        return
      }
      load()
    }, [load, router])
  )

  const dueList = list.filter(q => q.due)
  const shown = tab === 'due' ? dueList : list

  const startPrac = (qs: WrongQuestion[]) => {
    if (!qs.length) return toast('这里没有错题')
    setPrac({ qs, i: 0, right: 0, grad: 0, done: false })
    setPracAns('')
    setPracJudged(null)
    setPracFb('')
  }

  const judge = async (q: WrongQuestion, ans: string) => {
    const correct = ans === q.answer
    setPracJudged(correct)
    if (correct) hapticSuccess()
    else hapticError()
    setPrac(p => (p ? { ...p, right: p.right + (correct ? 1 : 0) } : p))
    try {
      const r = await api.wrongReview(q.id, correct)
      if (r.graduated) {
        setPracFb('🎓 连续答对多次，已自动移出错题本')
        setPrac(p => (p ? { ...p, grad: p.grad + 1 } : p))
      } else if (correct && r.next_days) setPracFb(`${r.next_days} 天后再复习这道题`)
      else setPracFb('')
    } catch {
      setPracFb('')
    }
  }

  const pracPick = (L: string) => {
    if (!prac || prac.done || pracJudged != null) return
    const q = prac.qs[prac.i]
    const isMulti = q.qtype === 'multi'
    const next = isMulti
      ? pracAns.includes(L)
        ? pracAns.split('').filter(c => c !== L).join('')
        : [...pracAns.split(''), L].sort().join('')
      : L
    setPracAns(next)
    if (!isMulti) void judge(q, next)
  }

  const pracNext = () => {
    if (!prac) return
    setPracAns('')
    setPracJudged(null)
    setPracFb('')
    if (prac.i + 1 < prac.qs.length) setPrac({ ...prac, i: prac.i + 1 })
    else setPrac({ ...prac, done: true })
  }

  // ---- 重练模式 ----
  if (prac) {
    if (prac.done) {
      return (
        <View className="flex-1 items-center justify-center bg-bgl px-8 dark:bg-bgd">
          <Text className="text-5xl">🎉</Text>
          <Text className="mt-4 text-xl font-bold text-gray-900 dark:text-gray-100">本轮重练完成</Text>
          <Text style={{ fontVariant: ['tabular-nums'] }} className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            答对 {prac.right}/{prac.qs.length}
            {prac.grad > 0 ? ` · ${prac.grad} 题毕业移出错题本` : ''}
          </Text>
          <ScaleButton
            className="mt-8 min-h-[50px] w-full items-center justify-center rounded-2xl bg-brand dark:bg-brand-dark"
            onPress={() => {
              setPrac(null)
              load()
            }}
          >
            <Text className="text-base font-semibold text-white">返回错题本</Text>
          </ScaleButton>
        </View>
      )
    }
    const q = prac.qs[prac.i]
    const isMulti = q.qtype === 'multi'
    const opts = [q.opt_a, q.opt_b, q.opt_c, q.opt_d]
    return (
      <View className="flex-1 bg-bgl dark:bg-bgd" style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center justify-between px-4 pb-2">
          <ScaleButton
            className="min-h-[44px] min-w-[44px] items-center justify-center"
            onPress={() => {
              setPrac(null)
              load()
            }}
          >
            <Text className="text-2xl text-gray-500 dark:text-gray-400">✕</Text>
          </ScaleButton>
          <Text style={{ fontVariant: ['tabular-nums'] }} className="text-sm text-gray-500 dark:text-gray-400">
            错题重练 {prac.i + 1} / {prac.qs.length}
          </Text>
          <View className="w-11" />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
          <Animated.View key={q.id} entering={FadeInUp.duration(220)}>
            <Text className="text-xs text-gray-400">
              {isMulti ? '多选' : '单选'} · {q.knowledge_point || '—'}
            </Text>
            <Text className="mt-2 text-lg leading-7 text-gray-900 dark:text-gray-100">{q.stem}</Text>
            <View className="mt-5 gap-3">
              {LETTERS.map((L, i) => {
                const selected = pracAns.includes(L)
                const judged = pracJudged != null
                const isRight = judged && q.answer.includes(L)
                const isWrongPick = judged && selected && !q.answer.includes(L)
                return (
                  <ScaleButton
                    key={L}
                    haptic={false}
                    className={`min-h-[52px] flex-row items-center rounded-2xl border-2 px-4 py-3.5 ${
                      isRight
                        ? 'border-ok bg-ok/10'
                        : isWrongPick
                          ? 'border-rose bg-rose/10'
                          : selected
                            ? 'border-brand bg-brand/5 dark:border-brand-dark dark:bg-brand-dark/10'
                            : 'border-transparent bg-white dark:bg-cardd'
                    }`}
                    onPress={() => pracPick(L)}
                  >
                    <View
                      className={`h-7 w-7 items-center justify-center rounded-full ${
                        isRight
                          ? 'bg-ok'
                          : isWrongPick
                            ? 'bg-rose'
                            : selected
                              ? 'bg-brand dark:bg-brand-dark'
                              : 'bg-gray-100 dark:bg-white/10'
                      }`}
                    >
                      <Text
                        className={`text-sm font-bold ${
                          selected || isRight || isWrongPick ? 'text-white' : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {L}
                      </Text>
                    </View>
                    <Text className="ml-3 flex-1 text-base leading-6 text-gray-800 dark:text-gray-200">{opts[i]}</Text>
                  </ScaleButton>
                )
              })}
            </View>
            {pracJudged != null && (
              <Animated.View entering={FadeInUp.duration(250)} className="mt-4 rounded-2xl bg-white p-4 dark:bg-cardd">
                <Text className={`text-base font-bold ${pracJudged ? 'text-ok dark:text-ok-dark' : 'text-rose'}`}>
                  {pracJudged ? '✓ 答对了' : `✗ 答错了 · 正确答案 ${q.answer}`}
                </Text>
                {!!pracFb && <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">{pracFb}</Text>}
                {!!q.analysis && (
                  <Text className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">解析:{q.analysis}</Text>
                )}
              </Animated.View>
            )}
          </Animated.View>
        </ScrollView>
        <View className="px-4" style={{ paddingBottom: insets.bottom + 12 }}>
          {isMulti && pracJudged == null ? (
            <ScaleButton
              className={`min-h-[50px] items-center justify-center rounded-2xl bg-brand dark:bg-brand-dark ${!pracAns ? 'opacity-40' : ''}`}
              disabled={!pracAns}
              onPress={() => void judge(q, pracAns)}
            >
              <Text className="text-base font-semibold text-white">确认答案</Text>
            </ScaleButton>
          ) : pracJudged != null ? (
            <ScaleButton
              className="min-h-[50px] items-center justify-center rounded-2xl bg-brand dark:bg-brand-dark"
              onPress={pracNext}
            >
              <Text className="text-base font-semibold text-white">
                {prac.i + 1 < prac.qs.length ? '下一题' : '完成本轮'}
              </Text>
            </ScaleButton>
          ) : null}
        </View>
      </View>
    )
  }

  // ---- 列表模式 ----
  return (
    <View className="flex-1 bg-bgl dark:bg-bgd" style={{ paddingTop: insets.top + 12 }}>
      <View className="px-4">
        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">错题本</Text>
        <View className="mt-4 flex-row rounded-2xl bg-gray-200/70 p-1 dark:bg-cardd">
          {(
            [
              ['due', `今日到期 ${dueList.length}`],
              ['all', `全部 ${list.length}`]
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
      ) : shown.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl">🌿</Text>
          <Text className="mt-3 text-center text-sm text-gray-400">
            {tab === 'due' ? '今天没有到期错题，去刷一卷真题吧' : '错题本是空的，答错的题会自动收进来'}
          </Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
            {shown.map((q, i) => (
              <Animated.View key={q.id} entering={FadeInUp.delay(Math.min(i * 30, 300)).duration(280)}>
                <View className="mb-3 rounded-3xl bg-white p-4 shadow-sm dark:bg-cardd">
                  <View className="flex-row items-center">
                    {q.due ? (
                      <View className="rounded-full bg-rose/15 px-2 py-0.5">
                        <Text className="text-[10px] font-bold text-rose">到期待复习</Text>
                      </View>
                    ) : (
                      <View className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-white/10">
                        <Text className="text-[10px] text-gray-400">
                          {q.due_at ? `${q.due_at.slice(5, 10)} 到期` : `盒 ${q.box}`}
                        </Text>
                      </View>
                    )}
                    <Text className="ml-2 flex-1 text-xs text-gray-400" numberOfLines={1}>
                      {q.knowledge_point || q.subject || '—'}
                    </Text>
                  </View>
                  <Text className="mt-2 text-sm leading-6 text-gray-800 dark:text-gray-200" numberOfLines={3}>
                    {q.stem}
                  </Text>
                  <Text className="mt-2 text-xs">
                    <Text className="text-rose">上次答 {q.your_answer || '—'}</Text>
                    <Text className="text-gray-400"> · </Text>
                    <Text className="text-ok dark:text-ok-dark">正确 {q.answer}</Text>
                  </Text>
                </View>
              </Animated.View>
            ))}
          </ScrollView>
          <View className="absolute bottom-0 left-0 right-0 px-4" style={{ paddingBottom: 12 }}>
            <ScaleButton
              className="min-h-[50px] items-center justify-center rounded-2xl bg-brand shadow-lg dark:bg-brand-dark"
              onPress={() => startPrac(shown)}
            >
              <Text className="text-base font-semibold text-white">
                重练{tab === 'due' ? '到期' : '全部'} {shown.length} 题
              </Text>
            </ScaleButton>
          </View>
        </>
      )}
    </View>
  )
}
