import { useEffect, useMemo, useState } from 'react'
import { Zap, RotateCcw, Hourglass } from 'lucide-react'
import { api } from '@/lib/api'
import type { Stats } from '@/lib/types'
import { useApp } from '@/lib/store'
import { nav } from '@/lib/router'
import { Button, Card, PageSkeleton } from '@/components/ui'

const HOURS = 72

interface SprintTask {
  id: string
  label: string
  desc: string
  minutes: number
  /** 直达动作：hash 路由或需调接口开卷的类型 */
  go: { type: 'nav'; hash: string } | { type: 'weak'; kps: string[] } | { type: 'kp'; name: string } | { type: 'shizheng' } | { type: 'mock'; year: number }
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

interface KpRow {
  subject: string
  kp_name: string
  n: number
}

async function buildPlan(): Promise<SprintPlan> {
  const [stats, kpstats, allKps, subjKps, years] = await Promise.all([
    api<Stats>('/stats').catch(() => null),
    api<{ kps?: { kp: string; correct: number; total: number }[] }>('/kpstats').catch(() => null),
    api<{ kps?: KpRow[] }>('/real/kps').catch(() => null),
    api<{ kps?: { kp_name: string; subject: string; year: number }[] }>('/real/subjective/kps').catch(() => null),
    api<{ years?: { year: number; n: number }[] }>('/real/years').catch(() => null),
  ])

  const wrongDue = stats?.wrong_due || 0
  const wrongCount = stats?.wrong_count || 0
  const latestYear = years?.years?.[0]?.year || 2026

  // 个人薄弱考点：同一考点作答满 2 题、正确率最低的 3-5 个；数据不足用全站高频考点兜底
  const personalWeak = (kpstats?.kps || []).filter((k) => k.total >= 2 && k.correct / k.total < 0.8).slice(0, 5).map((k) => k.kp)
  const hotKps = [...(allKps?.kps || [])].sort((a, b) => b.n - a.n).slice(0, 5).map((k) => k.kp_name)
  const weakKps = personalWeak.length >= 3 ? personalWeak : [...personalWeak, ...hotKps.filter((k) => !personalWeak.includes(k))].slice(0, 5)
  const isFallback = personalWeak.length < 3

  // 分析题背诵清单：近 2 年高频考点
  const memoKps = [
    ...new Set((subjKps?.kps || []).filter((k) => k.year >= latestYear - 1).map((k) => k.kp_name)),
  ].slice(0, 8)

  const day1: SprintTask[] = []
  if (wrongDue > 0)
    day1.push({
      id: 'd1-due',
      label: `复习 ${wrongDue} 道到期错题`,
      desc: '间隔重复到期队列，先清账再往前走',
      minutes: Math.min(60, Math.max(15, Math.round(wrongDue * 1.5))),
      go: { type: 'nav', hash: 'wrong' },
      goText: '去复习',
    })
  if (wrongCount > 0)
    day1.push({
      id: 'd1-practice',
      label: '顽固错题重练一遍',
      desc: `错题本共 ${wrongCount} 道，重练到全对为止`,
      minutes: Math.min(50, Math.max(20, wrongCount)),
      go: { type: 'nav', hash: 'practice' },
      goText: '去重练',
    })
  if (day1.length === 0)
    day1.push({
      id: 'd1-weak',
      label: '薄弱考点真题特训',
      desc: `${isFallback ? '全站高频考点' : '你的薄弱考点'}：${weakKps.slice(0, 3).join('、')}`,
      minutes: 30,
      go: { type: 'weak', kps: weakKps.slice(0, 3) },
      goText: '开卷',
    })
  day1.push({
    id: 'd1-rand',
    label: '真题快刷 20 题',
    desc: '全库随机抽题，保持手感',
    minutes: 25,
    go: { type: 'nav', hash: 'realrand' },
    goText: '去快刷',
  })

  const day2: SprintTask[] = [
    {
      id: 'd2-weak',
      label: '薄弱考点定向组卷',
      desc: `${isFallback ? '数据不足，按全站高频易错考点兜底' : '按你的正确率最低考点组卷'}：${weakKps.slice(0, 3).join('、')}`,
      minutes: 30,
      go: { type: 'weak', kps: weakKps.slice(0, 3) },
      goText: '开卷',
    },
  ]
  if (weakKps[3])
    day2.push({
      id: 'd2-kp1',
      label: `考点特训 · ${weakKps[3]}`,
      desc: '该考点历年真题连做 10 题',
      minutes: 20,
      go: { type: 'kp', name: weakKps[3] },
      goText: '开卷',
    })
  day2.push({
    id: 'd2-rand',
    label: '快刷 20 题巩固',
    desc: '定向练完全库混刷，检验迁移',
    minutes: 25,
    go: { type: 'nav', hash: 'realrand' },
    goText: '去快刷',
  })

  const day3: SprintTask[] = [
    {
      id: 'd3-sz',
      label: '时政 20 题',
      desc: '形势与政策月更题，考前必过一遍',
      minutes: 30,
      go: { type: 'shizheng' },
      goText: '开卷',
    },
    {
      id: 'd3-mock',
      label: `${latestYear} 全真模考`,
      desc: '180 分钟整卷（客观+分析题）；时间紧可改做随机 20 题快刷',
      minutes: 180,
      go: { type: 'mock', year: latestYear },
      goText: '开考',
    },
    {
      id: 'd3-memo',
      label: '分析题背诵清单',
      desc: memoKps.length ? `近 2 年高频：${memoKps.slice(0, 4).join('、')}${memoKps.length > 4 ? ' 等' : ''}` : '先想再看，逐条自评',
      minutes: 40,
      go: { type: 'nav', hash: 'realsubjlist' },
      goText: '去背诵',
    },
  ]

  return {
    at: Date.now(),
    memoKps,
    days: [
      { title: 'Day 1 · 错题清账', sub: '把欠的账先还上，错过的分不再错第二次', tasks: day1 },
      { title: 'Day 2 · 薄弱定向', sub: '正确率最低的考点，集中火力补短板', tasks: day2 },
      { title: 'Day 3 · 全真检验', sub: '按考场节奏走一遍，背诵收尾', tasks: day3 },
    ],
  }
}

function fmtLeft(ms: number): string {
  if (ms <= 0) return '已结束'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${h} 小时 ${m} 分`
}

export function SprintPage() {
  const { me, toast, confirm } = useApp()
  const uid = me?.id ?? ''
  const [plan, setPlan] = useState<SprintPlan | null>(null)
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  const persist = (p: SprintPlan, d: Record<string, boolean>) => {
    localStorage.setItem(storeKey(uid), JSON.stringify({ plan: p, done: d }))
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
    try {
      const saved = JSON.parse(localStorage.getItem(storeKey(uid)) || 'null')
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
    const g = t.go
    if (g.type === 'nav') return nav(g.hash)
    setBusy(t.id)
    try {
      if (g.type === 'weak') {
        const d = await api<{ id: number }>('/real/weak?kps=' + encodeURIComponent(g.kps.join(',')))
        nav('exam/' + d.id)
      } else if (g.type === 'kp') {
        const d = await api<{ id: number }>('/real/kp?name=' + encodeURIComponent(g.name))
        nav('exam/' + d.id)
      } else if (g.type === 'shizheng') {
        const d = await api<{ id: number }>('/real/shizheng')
        nav('exam/' + d.id)
      } else if (g.type === 'mock') {
        const d = await api<{ id: number; existed?: boolean }>('/real/mockpaper?year=' + g.year)
        if (d.existed) {
          const finished = await api('/papers/' + d.id + '/result').then(() => true).catch(() => false)
          if (finished) {
            setBusy('')
            return nav('result/' + d.id)
          }
        }
        localStorage.setItem('zt_timed_' + d.id, '1')
        nav('exam/' + d.id)
      }
    } catch (e) {
      toast((e as Error).message)
    }
    setBusy('')
  }

  const allTasks = useMemo(() => (plan?.days || []).flatMap((d) => d.tasks), [plan])
  const doneN = allTasks.filter((t) => done[t.id]).length
  const pct = allTasks.length ? Math.round((doneN / allTasks.length) * 100) : 0
  const leftMs = plan ? plan.at + HOURS * 3600000 - now : 0

  if (loading || !plan) return <PageSkeleton />

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Zap size={20} className="text-amber-500" /> 72 小时冲刺包
        </h1>
        <button onClick={() => nav('home')} className="text-sm text-ink-3 hover:text-brand-600">
          ← 工作台
        </button>
      </div>
      <p className="text-sm text-ink-2">考前 / 周末冲刺专用：3 天把「错题、弱项、实战」各过一遍，每块都可直达。</p>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold">
              整体进度 <span className="font-num">{doneN}</span>/{allTasks.length}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-3">
              <Hourglass size={12} /> 剩余 {fmtLeft(leftMs)}（自生成起 {HOURS} 小时）
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (doneN > 0 && !(await confirm('重新生成会重置所有勾选进度，确定？', '重新生成', '再想想'))) return
              generate()
            }}
          >
            <RotateCcw size={13} /> 重新生成
          </Button>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-ink/5">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        {leftMs <= 0 ? <p className="mt-2 text-xs text-warn-600">72 小时已到，点「重新生成」开始新一轮冲刺</p> : null}
      </Card>

      {plan.days.map((d) => {
        const dn = d.tasks.filter((t) => done[t.id]).length
        return (
          <Card key={d.title} className="p-5">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="flex items-center gap-2 text-[15px] font-bold">
                <span className="inline-block h-4 w-1.5 rounded bg-amber-500" />
                {d.title}
              </h2>
              <span className={`shrink-0 text-xs font-num ${dn === d.tasks.length ? 'text-ok-600 font-semibold' : 'text-ink-3'}`}>
                {dn}/{d.tasks.length}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-3">{d.sub}</p>
            <div className="mt-3 space-y-2.5">
              {d.tasks.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-xl bg-page px-3.5 py-3">
                  <button
                    onClick={() => toggle(t.id)}
                    aria-label={done[t.id] ? `取消完成：${t.label}` : `标记完成：${t.label}`}
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs transition-colors ${
                      done[t.id] ? 'bg-ok-500 text-white' : 'border-2 border-ink/15 text-transparent hover:border-ok-500'
                    }`}
                  >
                    ✓
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${done[t.id] ? 'text-ink-3 line-through' : ''}`}>
                      {t.label}
                      <span className="ml-1.5 rounded bg-ink/5 px-1.5 py-0.5 align-middle text-[10px] font-num text-ink-3 no-underline">
                        约 {t.minutes} 分钟
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-ink-3">{t.desc}</p>
                  </div>
                  {!done[t.id] ? (
                    <Button variant="soft" size="chip" disabled={busy === t.id} onClick={() => go(t)}>
                      {busy === t.id ? '开卷中…' : `${t.goText} ›`}
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        )
      })}
      <p className="pb-2 text-center text-xs text-ink-3">做完任务回本页手动勾选；勾选进度按账号保存在本机</p>
    </div>
  )
}
