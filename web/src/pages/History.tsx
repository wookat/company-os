import { useEffect, useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { api } from '@/lib/api'
import { useApp } from '@/lib/store'
import { nav } from '@/lib/router'
import { Button, Card, PageSkeleton } from '@/components/ui'
import type { Attempt, Stats } from '@/lib/types'
import { fmtDur, localDay } from '@/lib/utils'

interface KpStat {
  kp: string
  correct: number
  total: number
}

export function HistoryPage() {
  const { toast } = useApp()
  const [attempts, setAttempts] = useState<Attempt[] | null>(null)
  const [ks, setKs] = useState<KpStat[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [subjKps, setSubjKps] = useState<{ year: number; seq: number; kp_name: string }[]>([])

  useEffect(() => {
    Promise.all([
      api<{ attempts: Attempt[] }>('/history'),
      api<{ kps?: KpStat[] }>('/kpstats').catch(() => null),
      api<Stats>('/stats').catch(() => null),
      api<{ kps?: { year: number; seq: number; kp_name: string }[] }>('/real/subjective/kps').catch(() => null),
    ])
      .then(([h, k, s, sk]) => {
        setAttempts(h.attempts || [])
        setKs(k?.kps || [])
        setStats(s)
        setSubjKps(sk?.kps || [])
      })
      .catch((e) => {
        toast(e.message)
        setAttempts([])
      })
  }, [toast])

  const rows = useMemo(() => (attempts || []).filter((a) => a.total > 0), [attempts])
  const scored = useMemo(() => rows.filter((a) => a.answered === undefined || (a.answered ?? 0) > 0), [rows])

  const trend = useMemo(() => {
    const byDay = new Map<string, { s: number; t: number }>()
    for (const a of scored.slice(0, 60)) {
      if (!a.created_at) continue
      const d = localDay(a.created_at)
      const v = byDay.get(d) || { s: 0, t: 0 }
      v.s += a.score
      v.t += a.total
      byDay.set(d, v)
    }
    return [...byDay.entries()]
      .map(([d, v]) => ({ day: d.replace(/^\d+\//, ''), pct: Math.round((v.s / v.t) * 100) }))
      .reverse()
      .slice(-20)
  }, [scored])

  if (attempts === null) return <PageSkeleton />

  const sumT = scored.reduce((s, a) => s + a.total, 0)
  const sumS = scored.reduce((s, a) => s + a.score, 0)
  const avgPct = sumT ? Math.round((sumS / sumT) * 100) : 0
  const dayTs = stats?.attempt_day_ts || []
  const daySet = new Set(dayTs.map((t) => localDay(t)))
  const days = daySet.size
  let streak = 0
  for (let t = Date.now(); ; t -= 86400000) {
    const d = new Date(t).toLocaleDateString()
    if (daySet.has(d)) streak++
    else if (streak === 0 && d === new Date().toLocaleDateString()) continue
    else break
  }

  const weakKps = ks.filter((k) => k.total >= 2).sort((a, b) => a.correct / a.total - b.correct / b.total)
  const normKp = (n: string) => (n || '').replace(/和/g, '与').replace(/的辩证关系$/, '')
  const subjByKp: Record<string, string> = {}
  for (const r of subjKps) {
    const k2 = normKp(r.kp_name)
    if (!subjByKp[k2]) subjByKp[k2] = r.year + '-' + r.seq
  }

  const startWeakPaper = async () => {
    const weak = weakKps.slice(0, 8).map((k) => k.kp)
    if (!weak.length) return toast('先刷几卷真题，弱项榜有数据后再来组卷')
    try {
      const kk = await api<{ kps?: { kp_name: string }[] }>('/real/kps')
      const names: string[] = []
      for (const w of weak) {
        const hit = (kk.kps || []).find((k) => normKp(k.kp_name) === normKp(w))
        if (hit && !names.includes(hit.kp_name)) names.push(hit.kp_name)
        if (names.length >= 3) break
      }
      if (!names.length) return toast('弱项考点暂无对应真题，试试各考点的「AI 补练」')
      const d = await api<{ id: number; existed?: boolean }>('/real/weak?kps=' + encodeURIComponent(names.join(',')))
      if (d.existed) toast('继续上次未作答的弱项卷', true)
      nav('exam/' + d.id)
    } catch (e) {
      toast((e as Error).message)
    }
  }

  const drillKp = async (name: string) => {
    try {
      const d = await api<{ material_id: number; kp_id: number; imported?: string }>('/kpdrill?name=' + encodeURIComponent(name))
      if (d.imported) toast('已为你导入「' + d.imported + '」考点库，选题量即可生成补练卷', true)
      sessionStorage.setItem('zt_preset_kp', String(d.kp_id))
      nav('material/' + d.material_id)
    } catch (e) {
      toast((e as Error).message)
    }
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">成绩报告</h1>
        <button onClick={() => nav('home')} className="text-sm text-ink-3 hover:text-brand-600">
          ← 工作台
        </button>
      </div>
      <section className="grid grid-cols-2 gap-4 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 p-5 text-white shadow-card sm:grid-cols-4">
        <div>
          <p className="text-xs text-white/70">累计做题</p>
          <p className="mt-0.5 text-2xl font-extrabold font-num">{sumT}</p>
        </div>
        <div>
          <p className="text-xs text-white/70">平均正确率</p>
          <p className="mt-0.5 text-2xl font-extrabold font-num">{avgPct}%</p>
        </div>
        <div>
          <p className="text-xs text-white/70">学习天数</p>
          <p className="mt-0.5 text-2xl font-extrabold font-num">{days} 天</p>
        </div>
        <div>
          <p className="text-xs text-white/70">连续学习</p>
          <p className="mt-0.5 text-2xl font-extrabold font-num">
            {streak} 天{streak > 0 ? ' 🔥' : ''}
          </p>
        </div>
      </section>

      {trend.length >= 2 ? (
        <Card className="p-5">
          <h2 className="text-[15px] font-bold">正确率趋势（按天）</h2>
          <div className="mt-3 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9AA3B2' }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9AA3B2' }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => [`${v}%`, '正确率']} contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,.05)', fontSize: 12 }} />
                <Line type="monotone" dataKey="pct" stroke="#3D7FFF" strokeWidth={2.5} dot={{ r: 3, fill: '#3D7FFF' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : null}

      <Card className="p-5">
        <h2 className="flex items-center justify-between text-[15px] font-bold">
          弱项榜 <span className="text-xs font-normal text-ink-3">同考点作答满 2 题进入统计</span>
        </h2>
        {weakKps.length ? (
          <>
            <div className="mt-3 space-y-3">
              {weakKps.slice(0, 10).map((k) => {
                const pct = Math.round((k.correct / k.total) * 100)
                const subj = subjByKp[normKp(k.kp)]
                return (
                  <div key={k.kp}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">{k.kp}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className={`font-num text-xs font-semibold ${pct < 50 ? 'text-bad-600' : pct <= 70 ? 'text-warn-600' : 'text-ok-600'}`}>
                          {k.correct}/{k.total} · {pct}%
                        </span>
                        <button onClick={() => nav('realsearch/' + encodeURIComponent(k.kp))} className="text-xs font-medium text-rose-600 hover:text-rose-700">
                          练真题 ›
                        </button>
                        <button onClick={() => drillKp(k.kp)} className="text-xs font-medium text-brand-600 hover:text-brand-700">
                          AI 补练 ›
                        </button>
                        {subj ? (
                          <button onClick={() => nav('realsubj/' + subj)} className="text-xs font-medium text-rose-700 hover:text-rose-600" title="考过分析题，背要点">
                            📖
                          </button>
                        ) : null}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/5">
                      <div className={`h-full ${pct < 50 ? 'bg-bad-500' : pct <= 70 ? 'bg-warn-500' : 'bg-ok-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <Button variant="rose" size="sm" className="mt-4" onClick={startWeakPaper}>
              最薄弱 3 个考点真题组卷再练 ›
            </Button>
          </>
        ) : (
          <p className="mt-3 text-sm text-ink-3">先刷几卷真题，同一考点作答满 2 题后进入弱项榜</p>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="text-[15px] font-bold">全部成绩（{rows.length}）</h2>
        <div className="mt-3 divide-y divide-black/5">
          {rows.length ? (
            rows.map((a, i) => {
              const pct = Math.round((a.score / a.total) * 100)
              return (
                <button
                  key={i}
                  onClick={() => nav('result/' + a.paper_id)}
                  className="flex w-full items-center gap-3 py-3 text-left text-sm hover:bg-page"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{a.title || '试卷 #' + a.paper_id}</span>
                    <span className="mt-0.5 block text-xs text-ink-3">
                      {a.created_at ? localDay(a.created_at) : ''}
                      {a.duration_sec ? ' · 用时 ' + fmtDur(a.duration_sec) : ''}
                    </span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold font-num ${pct >= 70 ? 'bg-ok-50 text-ok-600' : pct >= 40 ? 'bg-warn-50 text-warn-600' : 'bg-rose-50 text-rose-500'}`}>
                    {a.score}/{a.total}
                  </span>
                </button>
              )
            })
          ) : (
            <p className="py-6 text-center text-sm text-ink-3">还没有成绩记录，去做一份真题卷吧</p>
          )}
        </div>
      </Card>
    </div>
  )
}
