import { useEffect, useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { api, requireLogin, toast, getUser } from '../../api'
import { SPRINT_BACK_KEY } from '../../components/SprintBack'
import './index.scss'
import { usePageTheme } from '../../theme'

const HOURS = 72

type SprintGo =
  | { type: 'page'; url: string }
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

// 纯规则生成 3 天计划：Day1 错题清账 / Day2 薄弱定向 / Day3 全真检验（与 Web Sprint.tsx 口径一致）
async function buildPlan(): Promise<SprintPlan> {
  const [stats, kpstats, allKps, subjKps, years] = await Promise.all([
    api.stats().catch(() => null),
    api.kpstats().catch(() => null),
    api.realKps().catch(() => null),
    api.subjKps().catch(() => null),
    api.realYears().catch(() => null)
  ])

  const wrongDue = stats?.wrong_due || 0
  const wrongCount = stats?.wrong_count || 0
  const latestYear = years?.years?.[0]?.year || 2026

  // 个人薄弱考点：同一考点作答满 2 题、正确率最低的 3-5 个；数据不足用全站高频考点兜底
  const personalWeak = (kpstats?.kps || []).filter(k => k.total >= 2 && k.correct / k.total < 0.8).slice(0, 5).map(k => k.kp)
  const hotKps = [...(allKps?.kps || [])].sort((a, b) => b.n - a.n).slice(0, 5).map(k => k.kp_name)
  const weakKps = personalWeak.length >= 3 ? personalWeak : [...personalWeak, ...hotKps.filter(k => !personalWeak.includes(k))].slice(0, 5)
  const isFallback = personalWeak.length < 3

  // 分析题背诵清单：近 2 年高频考点
  const memoKps = [
    ...new Set((subjKps?.kps || []).filter(k => k.year >= latestYear - 1).map(k => k.kp_name))
  ].slice(0, 8)

  const day1: SprintTask[] = []
  if (wrongDue > 0)
    day1.push({
      id: 'd1-due',
      label: `复习 ${wrongDue} 道到期错题`,
      desc: '间隔重复到期队列，先清账再往前走',
      minutes: Math.min(60, Math.max(15, Math.round(wrongDue * 1.5))),
      go: { type: 'page', url: '/pages/wrong/index' },
      goText: '去复习'
    })
  if (wrongCount > 0)
    day1.push({
      id: 'd1-practice',
      label: '顽固错题重练一遍',
      desc: `错题本共 ${wrongCount} 道，重练到全对为止`,
      minutes: Math.min(50, Math.max(20, wrongCount)),
      go: { type: 'page', url: '/pages/wrong/index' },
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
      desc: memoKps.length ? `近 2 年高频：${memoKps.slice(0, 4).join('、')}${memoKps.length > 4 ? ' 等' : ''}` : '先想再看，逐条自评',
      minutes: 40,
      go: { type: 'page', url: '/pages/recite/index' },
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
  const theme = usePageTheme()
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

  // 回到冲刺包页自动隐藏「回冲刺包」胶囊
  useDidShow(() => {
    try { Taro.removeStorageSync(SPRINT_BACK_KEY) } catch { }
  })

  const persist = (p: SprintPlan, d: Record<string, boolean>) => {
    try { Taro.setStorageSync(storeKey(uid), JSON.stringify({ plan: p, done: d })) } catch { }
  }

  const generate = async () => {
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
  }

  useEffect(() => {
    if (!requireLogin()) return
    try {
      const raw = Taro.getStorageSync(storeKey(uid))
      const saved = raw ? JSON.parse(raw) : null
      if (saved?.plan?.days) {
        setPlan(saved.plan)
        setDone(saved.done || {})
        setLoading(false)
        return
      }
    } catch {
      /* 忽略损坏数据，重新生成 */
    }
    generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid])

  const toggle = (id: string) => {
    if (!plan) return
    const d = { ...done, [id]: !done[id] }
    setDone(d)
    persist(plan, d)
  }

  const go = async (t: SprintTask) => {
    try { Taro.setStorageSync(SPRINT_BACK_KEY, '1') } catch { }
    const g = t.go
    if (g.type === 'page') return Taro.navigateTo({ url: g.url })
    if (busy) return
    setBusy(t.id)
    Taro.showLoading({ title: '组卷中…' })
    try {
      if (g.type === 'weak') {
        const r = await api.realWeak(g.kps)
        Taro.hideLoading()
        Taro.navigateTo({ url: `/pages/exam/index?paper=${r.id}` })
      } else if (g.type === 'kp') {
        const r = await api.realKp(g.name)
        Taro.hideLoading()
        Taro.navigateTo({ url: `/pages/exam/index?paper=${r.id}` })
      } else if (g.type === 'rand') {
        const r = await api.realRandPaper()
        Taro.hideLoading()
        Taro.navigateTo({ url: `/pages/exam/index?paper=${r.id}` })
      } else if (g.type === 'shizheng') {
        const r = await api.realShizheng()
        Taro.hideLoading()
        Taro.navigateTo({ url: `/pages/exam/index?paper=${r.id}` })
      } else if (g.type === 'mock') {
        const r = await api.realMockPaper(g.year)
        // 已考完的年份直接进成绩页复盘
        if (r.existed) {
          const finished = await api.result(r.id).then(() => true).catch(() => false)
          if (finished) {
            Taro.hideLoading()
            setBusy('')
            return Taro.navigateTo({ url: `/pages/result/index?paper=${r.id}` })
          }
        }
        try { Taro.setStorageSync(`zt_timed_${r.id}`, '1') } catch { }
        Taro.hideLoading()
        Taro.navigateTo({ url: `/pages/exam/index?paper=${r.id}` })
      }
    } catch (e: any) {
      Taro.hideLoading()
      toast(e.message)
    }
    setBusy('')
  }

  const allTasks = useMemo(() => (plan?.days || []).flatMap(d => d.tasks), [plan])
  const doneN = allTasks.filter(t => done[t.id]).length
  const pct = allTasks.length ? Math.round((doneN / allTasks.length) * 100) : 0
  const leftMs = plan ? plan.at + HOURS * 3600000 - now : 0

  // 重新生成需确认并重置勾选进度
  const regenerate = () => {
    if (doneN > 0) {
      Taro.showModal({
        title: '重新生成',
        content: '重新生成会重置所有勾选进度，确定？',
        confirmText: '重新生成',
        cancelText: '再想想',
        success: res => { if (res.confirm) generate() }
      })
      return
    }
    generate()
  }

  if (loading || !plan) return <View className={`page ${theme}`}><View className='empty'>计划生成中…</View></View>

  return (
    <View className={`page ${theme}`}>
      <View className='sprint-head'>
        <Text className='sprint-title'>⚡ 72 小时冲刺包</Text>
        <Text className='sprint-back-home' onClick={() => Taro.redirectTo({ url: '/pages/home/index' })}>← 工作台</Text>
      </View>
      <Text className='text-sm text-2 sprint-intro'>考前 / 周末冲刺专用：3 天把「错题、弱项、实战」各过一遍，每块都可直达。</Text>

      <View className='card'>
        <View className='sprint-progress-head'>
          <View>
            <Text className='sprint-progress-title'>整体进度 <Text className='num'>{doneN}</Text>/{allTasks.length}</Text>
            <Text className='text-xs text-3 sprint-left'>⏳ 剩余 {fmtLeft(leftMs)}</Text>
          </View>
          <View className='sprint-regen' onClick={regenerate}>↻ 重新生成</View>
        </View>
        <View className='sprint-bar'><View className='sprint-bar-fill' style={{ width: `${pct}%` }} /></View>
        <Text className='text-xs text-3 sprint-tip'>做完任务回本页手动勾选 · 进度按账号保存在本机</Text>
        {leftMs <= 0 && <Text className='text-xs sprint-expired'>72 小时已到，点「重新生成」开始新一轮冲刺</Text>}
      </View>

      {plan.days.map(d => {
        const dn = d.tasks.filter(t => done[t.id]).length
        return (
          <View key={d.title} className='card'>
            <View className='sprint-day-head'>
              <View className='sprint-day-title-row'>
                <View className='sprint-day-mark' />
                <Text className='sprint-day-title'>{d.title}</Text>
              </View>
              <Text className={`text-xs num ${dn === d.tasks.length ? 'sprint-day-done' : 'text-3'}`}>{dn}/{d.tasks.length}</Text>
            </View>
            <Text className='text-xs text-3 sprint-day-sub'>{d.sub}</Text>
            <View className='sprint-tasks'>
              {d.tasks.map(t => (
                <View key={t.id} className='sprint-task'>
                  <View className={`sprint-check ${done[t.id] ? 'on' : ''}`} onClick={() => toggle(t.id)}>
                    {done[t.id] ? '✓' : ''}
                  </View>
                  <View className='sprint-task-body'>
                    <View className='sprint-task-label-row'>
                      <Text className={`sprint-task-label ${done[t.id] ? 'done' : ''}`}>{t.label}</Text>
                      <Text className='sprint-task-min num'>约 {t.minutes} 分钟</Text>
                    </View>
                    <Text className='text-xs text-3 sprint-task-desc'>{t.desc}</Text>
                  </View>
                  {!done[t.id] && (
                    <View className='sprint-go' onClick={() => go(t)}>{busy === t.id ? '开卷中…' : `${t.goText} ›`}</View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )
      })}
    </View>
  )
}
