import { useEffect, useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Flame, CalendarCheck, Sparkles, BookX, GraduationCap, Zap, Search, BarChart3, Sun, Share2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import type { Stats, Attempt } from '@/lib/types'
import { useApp } from '@/lib/store'
import { nav } from '@/lib/router'
import { Button, Card, PageSkeleton } from '@/components/ui'
import { localDay, todayStr } from '@/lib/utils'

// 考研初试：每年 12 月倒数第二个周六；届别年份为次年
function nextExam(): { date: Date; year: number } {
  const examDate = (y: number) => {
    const d = new Date(y, 11, 31)
    while (d.getDay() !== 6) d.setDate(d.getDate() - 1)
    d.setDate(d.getDate() - 7)
    return d
  }
  const now = new Date()
  let ed = examDate(now.getFullYear())
  if (ed < now) ed = examDate(now.getFullYear() + 1)
  return { date: ed, year: ed.getFullYear() + 1 }
}
const EXAM = nextExam()

function calcStreak(days: Set<string>): number {
  let n = 0
  for (let t = Date.now(); ; t -= 86400000) {
    const d = new Date(t).toISOString().slice(0, 10)
    if (days.has(d)) n++
    else if (n === 0 && d === new Date().toISOString().slice(0, 10)) continue
    else break
  }
  return n
}

interface SubjYears {
  years: { year: number; n: number }[]
}

interface DailyQ {
  id: number
  year: number
  seq: number
  qtype: string
  stem: string
  opt_a: string
  opt_b: string
  opt_c: string
  opt_d: string
  answer: string
  analysis?: string
  subject?: string
  kp_name?: string
}

function makeStreakCard(streak: number, total: number, daysLeft: number): string {
  const W = 640,
    H = 800,
    c = document.createElement('canvas')
  c.width = W
  c.height = H
  const x = c.getContext('2d')!
  const g = x.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, '#3D7FFF')
  g.addColorStop(1, '#7C4DFF')
  x.fillStyle = g
  x.fillRect(0, 0, W, H)
  x.fillStyle = 'rgba(255,255,255,.12)'
  x.beginPath()
  x.arc(W - 60, 90, 130, 0, 7)
  x.fill()
  x.beginPath()
  x.arc(50, H - 70, 100, 0, 7)
  x.fill()
  x.fillStyle = '#fff'
  x.textAlign = 'center'
  x.font = 'bold 34px sans-serif'
  x.fillText('真题工坊 · 学习打卡', W / 2, 96)
  // 矢量火焰（避免 canvas emoji 跨平台渲染不一致）
  x.save()
  x.translate(W / 2 - 4, 290)
  x.scale(5, 5)
  x.fillStyle = '#fb923c'
  x.beginPath()
  x.moveTo(0, 0)
  x.bezierCurveTo(-9, -9, -3, -20, 1, -24)
  x.bezierCurveTo(1, -16, 6, -14, 6, -8)
  x.bezierCurveTo(10, -12, 9, -15, 8, -18)
  x.bezierCurveTo(14, -12, 12, -3, 6, 1)
  x.bezierCurveTo(1, 4, -5, 3, 0, 0)
  x.fill()
  x.restore()
  x.fillStyle = '#fff'
  x.font = 'bold 88px sans-serif'
  x.fillText(`连续 ${streak} 天`, W / 2, 430)
  x.font = '30px sans-serif'
  x.fillStyle = 'rgba(255,255,255,.9)'
  x.fillText(`累计打卡 ${total} 天 · 考研政治真题一天不落`, W / 2, 500)
  x.fillText(`距考研初试还有 ${daysLeft} 天`, W / 2, 552)
  x.fillStyle = 'rgba(255,255,255,.92)'
  x.font = '26px sans-serif'
  x.fillText('历年真题免费在线刷 · 判分 · 错题本 · 分析题背诵', W / 2, 660)
  x.font = 'bold 30px sans-serif'
  x.fillStyle = '#fff'
  x.fillText('zhenti.zalize.com', W / 2, 716)
  return c.toDataURL('image/png')
}

function DailyCard({ onReveal }: { onReveal: () => void }) {
  const { toast } = useApp()
  const [q, setQ] = useState<DailyQ | null>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    api<{ q: DailyQ }>('/real/daily')
      .then((d) => setQ(d.q))
      .catch(() => undefined)
  }, [])

  if (!q) return null
  const opts: [string, string][] = [
    ['A', q.opt_a],
    ['B', q.opt_b],
    ['C', q.opt_c],
    ['D', q.opt_d],
  ]

  const reveal = () => {
    if (revealed) return
    setRevealed(true)
    api('/daily-reveal?src=app', { method: 'POST' }).catch(() => undefined)
    onReveal()
  }

  const share = () => {
    const text = `今天这道考研政治真题你会吗？「${q.stem.replace(/\s+/g, ' ').slice(0, 40)}…」来对答案：https://zhenti.zalize.com/zhenti/${q.year}#q${q.seq}`
    navigator.clipboard
      .writeText(text)
      .then(() => toast('已复制，发给研友一起做', true))
      .catch(() => toast('复制失败，请手动复制链接'))
  }

  return (
    <Card className="border-rose-100 p-5">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-500">
            <Sun size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
              <span className="shrink-0">每日一题</span>
              <span className="min-w-0 truncate font-normal text-ink-3">{q.stem.slice(0, 20)}…</span>
            </span>
            <span className="mt-0.5 block truncate text-xs text-ink-3">{q.kp_name || q.subject || ''}</span>
          </span>
          <span className="shrink-0 text-sm font-semibold text-rose-500 group-open:hidden">做一做 ›</span>
          <span className="hidden shrink-0 text-sm font-semibold text-ink-3 group-open:inline">收起 ▴</span>
        </summary>
        <p className="mt-3 text-sm leading-6">
          <span className={`mr-1.5 inline-block rounded px-1.5 py-0.5 align-middle text-[11px] font-semibold ${q.qtype === 'multi' ? 'bg-violet-100 text-violet-600' : 'bg-black/5 text-ink-3'}`}>
            {q.year} 年第 {q.seq} 题 · {q.qtype === 'multi' ? '多选' : '单选'}
          </span>
          {q.stem}
        </p>
        <div className="mt-2 space-y-1">
          {opts.map(([k, v]) => (
            <p key={k} className={`text-sm leading-6 ${revealed && q.answer.includes(k) ? 'font-medium text-emerald-700' : 'text-ink-2'}`}>
              {revealed && q.answer.includes(k) ? '✓ ' : ''}
              {k}. {v}
            </p>
          ))}
        </div>
        {revealed ? (
          <div className="mt-3 rounded-xl bg-page px-3.5 py-3 text-xs leading-5 text-ink-2">
            <b className="text-ink-1">答案 {q.answer}</b>
            {(q.analysis || '').split(/(?=[A-D](?:项|正确|错误|对|错))/).map((seg, i) => (
              <span key={i} className="block">
                {seg}
              </span>
            ))}
            <span className="mt-1.5 flex flex-wrap items-center gap-x-3">
              {q.kp_name ? (
                <button
                  onClick={() => nav('realsearch/' + encodeURIComponent(q.kp_name!))}
                  className="inline-flex min-h-[32px] items-center font-semibold text-rose-600 hover:text-rose-700"
                >
                  没把握？练「{q.kp_name}」全部真题 ›
                </button>
              ) : null}
              <button onClick={share} className="inline-flex min-h-[32px] items-center gap-1 font-medium text-ink-3 hover:text-ink-1">
                <Share2 size={12} /> 分享给研友
              </button>
            </span>
          </div>
        ) : (
          <button
            onClick={reveal}
            className="mt-2 inline-flex min-h-[36px] items-center rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-100"
          >
            先想好答案，再点我揭晓 ›
          </button>
        )}
      </details>
    </Card>
  )
}

export function HomePage() {
  const { me, toast } = useApp()
  const [stats, setStats] = useState<Stats | null>(null)
  const [checkin, setCheckin] = useState<string[] | null>(null)
  const [subjYears, setSubjYears] = useState<SubjYears | null>(null)
  const [memoN, setMemoN] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [celebrate, setCelebrate] = useState<number | null>(null)

  useEffect(() => {
    if (celebrate === null) return
    const t = setTimeout(() => setCelebrate(null), 1800)
    return () => clearTimeout(t)
  }, [celebrate])

  useEffect(() => {
    Promise.all([
      api<Stats>('/stats').catch(() => null),
      api<{ days?: string[] }>('/checkin').catch(() => null),
      api<SubjYears>('/real/subjective/years').catch(() => null),
      api<{ keys?: string[] }>('/subjmemo').catch(() => null),
    ]).then(([s, c, sy, m]) => {
      setStats(s)
      setCheckin(c?.days || [])
      setSubjYears(sy)
      setMemoN(m?.keys?.length ?? 0)
      setLoading(false)
    })
  }, [])

  // 学习日 = 打卡日 ∪ 作答日 ∪ 背诵日（与旧版 /app 口径统一）
  const daySet = useMemo(() => {
    const s = new Set(checkin || [])
    for (const ts of stats?.attempt_day_ts || []) s.add(ts.slice(0, 10))
    return s
  }, [checkin, stats])
  const today = new Date().toISOString().slice(0, 10)
  const checked = daySet.has(today)
  const streak = useMemo(() => calcStreak(daySet), [daySet])
  const daysLeft = Math.max(0, Math.ceil((EXAM.date.getTime() - Date.now()) / 86400000))

  const postCheckin = async (src?: string): Promise<boolean | string> => {
    const opts = { method: 'POST', body: src ? JSON.stringify({ src }) : undefined }
    try {
      await api('/checkin', opts)
      return true
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) return e.message
      try {
        await api('/checkin', opts)
        return true
      } catch (e2) {
        if (e2 instanceof ApiError && e2.status === 409) return e2.message
        return false
      }
    }
  }

  const doCheckin = async () => {
    if (checked) return
    const prev = checkin || []
    setCheckin([...prev, today])
    const r = await postCheckin()
    if (r === true) {
      setCelebrate(streak + 1)
      toast(
        streak > 0
          ? `已打卡，连续学习 ${streak + 1} 天 🔥，点头部「连续学习」可生成分享图`
          : '今日打卡成功 ✓，点头部「连续学习」可生成分享图',
        true
      )
      const hintN = parseInt(localStorage.getItem('zt_remind_hint') || '0', 10)
      if (hintN < 3) {
        api<{ on: boolean }>('/remind')
          .then((d) => {
            if (d.on) {
              localStorage.setItem('zt_remind_hint', '3')
            } else {
              localStorage.setItem('zt_remind_hint', String(hintN + 1))
              setTimeout(
                () => toast('怕忘打卡？可开启每天 8:00 邮件提醒', true, { label: '去开启 ›', hash: 'account' }),
                3500
              )
            }
          })
          .catch(() => undefined)
      }
    } else {
      setCheckin(prev)
      toast(typeof r === 'string' ? r : '打卡未保存（网络较慢），请重试')
    }
  }

  // 正确率趋势：最近 30 次作答按天聚合
  const trend = useMemo(() => {
    const rows = (stats?.attempts || [])
      .filter((a) => a.total > 0)
      .slice(0, 30)
      .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
    if (!rows.length) return []
    const byDay = new Map<string, { s: number; t: number }>()
    for (const a of rows) {
      if (!a.created_at) continue
      const d = localDay(a.created_at)
      const v = byDay.get(d) || { s: 0, t: 0 }
      v.s += a.score
      v.t += a.total
      byDay.set(d, v)
    }
    let pts = [...byDay.entries()].map(([d, v]) => ({ day: d.replace(/^\d+\//, ''), pct: Math.round((v.s / v.t) * 100) }))
    if (pts.length < 2)
      pts = rows
        .slice(-7)
        .map((a, i) => ({ day: `第${i + 1}卷`, pct: Math.round((a.score / a.total) * 100) }))
    return pts.slice(-14)
  }, [stats])

  // 周摘要
  const week = useMemo(() => {
    const rows = (stats?.attempts || []).filter((a) => a.total > 0)
    const wk = Date.now() - 7 * 86400000
    const inWeek = (a: Attempt) =>
      a.created_at && new Date(a.created_at.replace(' ', 'T') + 'Z').getTime() >= wk
    const w = rows.filter(inWeek)
    const t = w.reduce((s, a) => s + a.total, 0)
    const s = w.reduce((x, a) => x + a.score, 0)
    const days = new Set(w.map((a) => localDay(a.created_at!))).size
    return { n: w.length, qn: t, pct: t ? Math.round((s / t) * 100) : 0, days }
  }, [stats])

  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const onboardKey = `zt_onboard_done:${me?.id ?? ''}`
  const [onboardHidden, setOnboardHidden] = useState(() => localStorage.getItem('zt_onboard_done') === '1')
  useEffect(() => {
    if (me) setOnboardHidden(localStorage.getItem(onboardKey) === '1' || localStorage.getItem('zt_onboard_done') === '1')
  }, [me, onboardKey])

  useEffect(() => {
    if (!shareUrl) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShareUrl(null)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [shareUrl])

  const attempts = (stats?.attempts || []).filter((a) => a.total > 0)
  const todayDone = attempts.some((a) => a.created_at && localDay(a.created_at) === todayStr())
  const wrongDue = stats?.wrong_due || 0
  const subjTotal = (subjYears?.years || []).reduce((s, y) => s + y.n, 0)

  if (loading) return <PageSkeleton />

  return (
    <div className="space-y-4 pt-2">
      {celebrate !== null ? (
        <div className="pointer-events-none fixed inset-0 z-[70] grid place-items-center">
          <div className="animate-[ztpop_.5s_cubic-bezier(.2,1.4,.4,1)] flex flex-col items-center gap-1 rounded-3xl bg-slate-900/80 px-8 py-6 text-white shadow-2xl backdrop-blur">
            <span className="text-5xl">🔥</span>
            <span className="font-num text-3xl font-extrabold">{celebrate} 天</span>
            <span className="text-sm text-white/85">{celebrate >= 30 ? '30 天里程碑！持之以恒的人不多' : celebrate >= 7 ? '连续 7 天+，习惯已经在长成' : '连续学习打卡成功'}</span>
          </div>
          <style>{`@keyframes ztpop{0%{transform:scale(.5);opacity:0}100%{transform:scale(1);opacity:1}}`}</style>
        </div>
      ) : null}
      {/* 沉浸头部（移动端）/ 顶部横幅 */}
      <section className="lg:rounded-2xl -mx-4 lg:mx-0 bg-gradient-to-br from-brand-500 to-brand-700 text-white px-5 pt-8 pb-6 lg:pt-6 rounded-b-[28px] lg:rounded-b-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-white/80">你好{me ? `，${me.email.split('@')[0]}` : ''} 👋</p>
            <h1 className="mt-1 text-xl font-extrabold">
              距 {EXAM.year} 考研初试还有 <span className="font-num">{daysLeft}</span> 天
            </h1>
            <p className="mt-1 text-xs text-white/75">每天一卷真题 + 清错题，是性价比最高的节奏</p>
          </div>
          <button
            onClick={doCheckin}
            className={`btn-press shrink-0 flex flex-col items-center rounded-2xl px-4 py-2.5 text-xs font-semibold ${
              checked ? 'bg-white/20 text-white' : 'bg-white text-brand-600'
            }`}
          >
            {checked ? <CalendarCheck size={20} /> : <Flame size={20} className="text-streak-500" />}
            {checked ? '已打卡 ✓' : '今日打卡'}
          </button>
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs">
          <button
            onClick={() => streak > 0 && setShareUrl(makeStreakCard(streak, daySet.size, daysLeft))}
            className="inline-flex min-h-[32px] items-center gap-1 rounded-full bg-white/15 px-2.5 py-1"
            title={streak > 0 ? '生成打卡分享图' : undefined}
          >
            <Flame size={12} className="text-orange-300" /> 连续学习{' '}
            <b className="font-num">{streak}</b> 天{streak > 0 ? <span className="ml-1 text-white/75">分享 ›</span> : null}
          </button>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1">
            本周作答 <b className="font-num">{week.n}</b> 次 · 正确率{' '}
            <b className="font-num">{week.pct}%</b>
          </span>
        </div>
      </section>

      {/* 新用户上手引导（无作答记录时展示，可关闭） */}
      {attempts.length === 0 && !onboardHidden && (
        <Card className="p-5 border-brand-100 bg-brand-50/40">
          <div className="flex items-start justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[15px] font-bold">
              <span className="inline-block h-4 w-1.5 rounded bg-brand-500" />
              三步上手真题工坊
            </h2>
            <button
              onClick={() => { setOnboardHidden(true); localStorage.setItem(onboardKey, '1') }}
              className="btn-press grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:bg-black/5"
              aria-label="关闭引导"
            >
              ✕
            </button>
          </div>
          <ol className="mt-3 space-y-2.5 text-sm">
            <li className="flex items-center gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-500 text-[12px] font-bold text-white">1</span>
              <span className="min-w-0 flex-1">先做一份最新真题卷，摸清自己的底子</span>
              <button onClick={() => nav('realyear/2026')} className="btn-press shrink-0 min-h-[32px] rounded-full bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white">做 2026 卷 ›</button>
            </li>
            <li className="flex items-center gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-500 text-[12px] font-bold text-white">2</span>
              <span className="min-w-0 flex-1">交卷后看考点报告，错题自动进错题本</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-500 text-[12px] font-bold text-white">3</span>
              <span className="min-w-0 flex-1">每天揭晓每日一题打卡，可开 8:00 邮件提醒</span>
              <button onClick={() => nav('account')} className="btn-press shrink-0 min-h-[32px] rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-600">开提醒 ›</button>
            </li>
          </ol>
        </Card>
      )}

      {/* 2026 新卷卡 */}
      <Card className="card-hover p-0 overflow-hidden">
        <button onClick={() => nav('realyear/2026')} className="w-full text-left p-5 flex items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-500">
            <Sparkles size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <b className="text-[15px]">2026 考研政治真题卷</b>
              <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-semibold text-rose-600">
                NEW
              </span>
            </span>
            <span className="mt-0.5 block text-xs text-ink-3">
              最新一年真题已上架，整卷模考自动判分，错题进错题本
            </span>
          </span>
          <span className="shrink-0 text-ink-3">›</span>
        </button>
      </Card>

      {/* 每日一题 */}
      <DailyCard
        onReveal={async () => {
          if (checked) return
          const prev = checkin || []
          setCheckin([...prev, today])
          if ((await postCheckin('daily')) === true) {
            setCelebrate(streak + 1)
          } else {
            setCheckin(prev)
            toast('打卡未保存（网络较慢），点头部「今日打卡」重试')
          }
        }}
      />

      {/* 今日任务 */}
      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-[15px] font-bold">
          <span className="inline-block h-4 w-1.5 rounded bg-brand-500" />
          今日任务
        </h2>
        <div className="mt-3 space-y-2.5">
          <TaskRow
            done={todayDone}
            label="做一份真题卷"
            desc={todayDone ? '今日已作答，明天继续' : '整卷模考或快刷 20 题都算'}
            action={() => nav('real')}
            actionText="去做卷"
          />
          <TaskRow
            done={wrongDue === 0}
            label={wrongDue ? `复习 ${wrongDue} 道到期错题` : '错题复习'}
            desc={wrongDue ? '间隔重复，连对 4 次自动毕业' : '今日到期错题已清'}
            action={() => nav('wrong')}
            actionText="去复习"
          />
          <TaskRow
            done={false}
            label="背 1 道分析题"
            desc={memoN != null && subjTotal ? `已背会 ${memoN}/${subjTotal} 道` : '先想再看，逐条自评'}
            action={() => nav('realsubjlist')}
            actionText="去背诵"
          />
        </div>
      </Card>

      {/* 正确率趋势 */}
      {trend.length >= 2 ? (
        <Card className="p-5">
          <h2 className="flex items-center justify-between text-[15px] font-bold">
            正确率趋势
            <button onClick={() => nav('history')} className="text-xs font-medium text-brand-600">
              成绩报告 →
            </button>
          </h2>
          <div className="mt-3 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9AA3B2' }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, (m: number) => Math.min(100, m + 10)]} tick={{ fontSize: 11, fill: '#9AA3B2' }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => [`${v}%`, '正确率']} contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,.05)', fontSize: 12 }} />
                <Line type="monotone" dataKey="pct" stroke="#3D7FFF" strokeWidth={2.5} dot={{ r: 3, fill: '#3D7FFF' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : (
        <Card className="border-dashed p-6 text-center text-sm text-ink-3">
          做 2 卷以上，这里会画出你的正确率趋势曲线
        </Card>
      )}

      {/* 快捷入口 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickCard icon={<Zap size={18} />} label="真题快刷" desc="随机 20 题" onClick={() => nav('realrand')} />
        <QuickCard icon={<BookX size={18} />} label="错题重练" desc={`${stats?.wrong_count || 0} 道待攻克`} onClick={() => nav('wrong')} />
        <QuickCard icon={<GraduationCap size={18} />} label="分析题背诵" desc="先想再看" onClick={() => nav('realsubjlist')} />
        <QuickCard icon={<Search size={18} />} label="考点搜真题" desc="全库检索" onClick={() => nav('real')} />
      </div>

      {/* 本周摘要 */}
      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-[15px] font-bold">
          <BarChart3 size={16} className="text-brand-500" /> 本周摘要
        </h2>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-page p-3">
            <p className="text-xl font-extrabold font-num">{week.qn}</p>
            <p className="mt-0.5 text-xs text-ink-3">本周做题（道）</p>
          </div>
          <div className="rounded-xl bg-page p-3">
            <p className="text-xl font-extrabold font-num">{week.days}</p>
            <p className="mt-0.5 text-xs text-ink-3">有作答天数</p>
          </div>
          <div className="rounded-xl bg-page p-3">
            <p className="text-xl font-extrabold font-num">{wrongDue}</p>
            <p className="mt-0.5 text-xs text-ink-3">待复习错题</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-3">
          考点覆盖 {stats?.kp_covered || 0}/{stats?.kp_total || 0} · 错题本 {stats?.wrong_count || 0} 道
          {wrongDue ? `（${wrongDue} 道今日到期）` : ''}
        </p>
      </Card>
      <Button variant="soft" size="sm" className="w-full" onClick={() => nav('history')}>
        查看完整学习报告与弱项榜 →
      </Button>

      {shareUrl ? (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/60 p-4"
          onClick={() => setShareUrl(null)}
        >
          <div className="relative w-full max-w-xs rounded-2xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShareUrl(null)}
              aria-label="关闭"
              className="absolute -top-2.5 -right-2.5 grid h-8 w-8 place-items-center rounded-full bg-white text-ink-2 shadow-md"
            >
              ✕
            </button>
            <img src={shareUrl} alt="打卡分享图" className="w-full rounded-xl" />
            <p className="mt-2 text-center text-xs text-ink-3">手机可长按图片保存，发给研友一起打卡</p>
            <a
              href={shareUrl}
              download={`真题工坊打卡${streak}天.png`}
              className="mt-3 block w-full rounded-xl bg-brand-500 py-2.5 text-center text-sm font-semibold text-white"
            >
              保存图片
            </a>
            <button onClick={() => setShareUrl(null)} className="mt-2 w-full rounded-xl bg-black/5 py-2.5 text-sm text-ink-2">
              关闭
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function TaskRow({
  done,
  label,
  desc,
  action,
  actionText,
}: {
  done: boolean
  label: string
  desc: string
  action: () => void
  actionText: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-page px-3.5 py-3">
      <span
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs ${
          done ? 'bg-ok-500 text-white' : 'border-2 border-black/10 text-transparent'
        }`}
      >
        ✓
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${done ? 'text-ink-3 line-through' : ''}`}>{label}</p>
        <p className="text-xs text-ink-3">{desc}</p>
      </div>
      {!done ? (
        <Button variant="soft" size="chip" onClick={action}>
          {actionText} ›
        </Button>
      ) : null}
    </div>
  )
}

function QuickCard({
  icon,
  label,
  desc,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  desc: string
  onClick: () => void
}) {
  return (
    <Card className="card-hover p-0">
      <button onClick={onClick} className="w-full p-4 text-left">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
          {icon}
        </span>
        <p className="mt-2 text-sm font-semibold">{label}</p>
        <p className="text-xs text-ink-3">{desc}</p>
      </button>
    </Card>
  )
}

/** 桌面右栏：打卡热力 + 弱项榜 + 背诵进度 */
export function HomeRail() {
  const [ks, setKs] = useState<{ kp: string; correct: number; total: number }[] | null>(null)
  const [checkin, setCheckin] = useState<string[]>([])
  const [memo, setMemo] = useState<{ n: number; total: number } | null>(null)

  useEffect(() => {
    api<{ kps?: { kp: string; correct: number; total: number }[] }>('/kpstats')
      .then((d) => setKs((d.kps || []).filter((k) => k.total >= 2).slice(0, 5)))
      .catch(() => setKs([]))
    Promise.all([
      api<{ days?: string[] }>('/checkin').catch(() => null),
      api<Stats>('/stats').catch(() => null),
    ]).then(([c, s]) => {
      const days = [...(c?.days || []), ...(s?.attempt_day_ts || []).map((ts) => ts.slice(0, 10))]
      setCheckin([...new Set(days)])
    })
    Promise.all([
      api<{ keys?: string[] }>('/subjmemo').catch(() => null),
      api<SubjYears>('/real/subjective/years').catch(() => null),
    ]).then(([m, sy]) => {
      const total = (sy?.years || []).reduce((s, y) => s + y.n, 0)
      if (total) setMemo({ n: m?.keys?.length || 0, total })
    })
  }, [])

  // 近四周打卡格（打卡日 ∪ 作答/背诵日，与头部口径一致）
  const days = new Set(checkin)
  const cells: { d: string; on: boolean }[] = []
  for (let i = 27; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
    cells.push({ d, on: days.has(d) })
  }

  return (
    <>
      <Card className="p-4">
        <h3 className="text-sm font-bold">近四周打卡</h3>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {cells.map((c) => (
            <span
              key={c.d}
              title={c.d}
              className={`h-6 rounded ${c.on ? 'bg-brand-500' : 'bg-black/5'}`}
            />
          ))}
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="flex items-center justify-between text-sm font-bold">
          弱项榜
          <button onClick={() => nav('history')} className="text-xs font-medium text-brand-600">
            全部 →
          </button>
        </h3>
        {ks === null ? (
          <p className="mt-3 text-xs text-ink-3">加载中…</p>
        ) : ks.length ? (
          <div className="mt-3 space-y-2.5">
            {ks.map((k) => {
              const pct = Math.round((k.correct / k.total) * 100)
              return (
                <div key={k.kp}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 truncate">{k.kp}</span>
                    <span className={`shrink-0 font-num font-semibold ${pct < 50 ? 'text-bad-600' : pct <= 70 ? 'text-warn-600' : 'text-ok-600'}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-black/5 overflow-hidden">
                    <div
                      className={`h-full ${pct < 50 ? 'bg-bad-500' : pct <= 70 ? 'bg-warn-500' : 'bg-ok-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="mt-3 text-xs text-ink-3">同一考点作答满 2 题后显示薄弱考点</p>
        )}
      </Card>
      {memo ? (
        <Card className="p-4">
          <h3 className="text-sm font-bold">分析题背诵进度</h3>
          <p className="mt-2 text-sm">
            已背 <b className="font-num text-rose-600">{memo.n}</b>/{memo.total} 道
          </p>
          <div className="mt-2 h-2 rounded-full bg-black/5 overflow-hidden">
            <div
              className="h-full bg-rose-500"
              style={{ width: `${Math.round((memo.n / memo.total) * 100)}%` }}
            />
          </div>
          <Button variant="roseSoft" size="chip" className="mt-3" onClick={() => nav('realsubjlist')}>
            去背诵 ›
          </Button>
        </Card>
      ) : null}
    </>
  )
}
