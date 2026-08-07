import { useEffect, useRef, useState } from 'react'
import { Printer } from 'lucide-react'
import { api } from '@/lib/api'
import { useApp } from '@/lib/store'
import { nav } from '@/lib/router'
import { Button, Card, PageSkeleton } from '@/components/ui'
import type { SubjQuestion } from '@/lib/types'
import { subjColor } from '@/lib/utils'

const esc = (s: string) =>
  (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

interface SubjData {
  year: number
  questions: SubjQuestion[]
}
interface Hit {
  n: number
  t: number
  sel: number[]
}

// 材料中去掉与设问重复的行
function subjStem(q: SubjQuestion): string {
  if (!q.questions || !q.questions.length) return q.stem
  const keys = q.questions.map((s) => s.slice(0, 12))
  return q.stem
    .split('\n')
    .filter((line) => {
      const l = line.replace(/^\s*[（(]\d+[）)]\s*/, '')
      return !keys.some((k) => k && l.startsWith(k))
    })
    .join('\n')
    .trim()
}

function printSubj(d: SubjData) {
  let pa = document.getElementById('printArea')
  if (!pa) {
    pa = document.createElement('div')
    pa.id = 'printArea'
    document.body.appendChild(pa)
  }
  pa.innerHTML =
    `<div style="max-width:720px;margin:0 auto;font-size:14px;line-height:1.7"><h1 style="font-size:18px;font-weight:800">${d.year} 年分析题背诵版（${d.questions.length} 道）· 真题工坊</h1><p style="color:#64748b;font-size:12px">要点为原创整理，以官方《考试分析》为准。</p>` +
    d.questions
      .map(
        (q) =>
          `<div style="margin-top:14px;padding:12px;border:1px solid #ddd;border-radius:8px;break-inside:avoid"><p style="font-weight:700">第 ${q.seq} 题${q.kp_name ? ` · ${esc(q.kp_name)}` : ''}${q.subject ? `（${esc(q.subject)}）` : ''}</p>${(q.questions || []).map((sq, i) => `<p style="font-weight:600">（${i + 1}）${esc(sq)}</p>`).join('')}<p style="margin-top:6px;font-weight:600">参考答案要点：</p><ol style="margin:2px 0 0 18px;padding:0;color:#334155">${(q.answer_points || []).map((pt) => `<li style="margin-top:3px">${esc(pt)}</li>`).join('')}</ol></div>`
      )
      .join('') +
    `</div>`
  window.print()
}

export function SubjPage({ year, seq }: { year: number; seq?: number }) {
  const { toast } = useApp()
  const [d, setD] = useState<SubjData | null>(null)
  const [memo, setMemo] = useState<Set<string>>(new Set())
  const [hits, setHits] = useState<Record<string, Hit>>({})
  const [onlyUnmemo, setOnlyUnmemo] = useState(false)
  const [cloze, setCloze] = useState<Set<string>>(new Set())
  const [revealed, setRevealed] = useState<Record<string, Set<number>>>({})
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    setD(null)
    Promise.all([
      api<SubjData>('/real/subjective?year=' + year),
      api<{ keys: string[]; hits?: Record<string, { n: number; t: number; sel?: number[] }> }>('/subjmemo').catch(() => null),
    ])
      .then(([dd, m]) => {
        setD(dd)
        if (m) {
          setMemo(new Set(m.keys || []))
          const h: Record<string, Hit> = {}
          for (const [k, v] of Object.entries(m.hits || {})) h[k] = { n: v.n, t: v.t, sel: v.sel || [] }
          setHits(h)
        }
      })
      .catch((e) => {
        toast(e.message)
        nav('real')
      })
  }, [year, toast])

  useEffect(() => {
    if (d && seq) {
      const el = document.getElementById('subj-' + seq)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
  }, [d, seq])

  if (!d) return <PageSkeleton />

  const togglePt = (k: string, pi: number, total: number) => {
    setHits((prev) => {
      const cur = prev[k] || { n: 0, t: total, sel: [] }
      const sel = cur.sel.includes(pi) ? cur.sel.filter((x) => x !== pi) : [...cur.sel, pi]
      const next = { ...prev, [k]: { n: sel.length, t: total, sel } }
      clearTimeout(timers.current[k])
      timers.current[k] = setTimeout(() => {
        const [y, s] = k.split('-')
        api('/subjmemo/hit', {
          method: 'POST',
          body: JSON.stringify({ year: +y, seq: +s, n: sel.length, t: total, sel }),
        }).catch(() => undefined)
      }, 300)
      return next
    })
  }

  const toggleCloze = (k: string) => {
    setCloze((prev) => {
      const n = new Set(prev)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })
    setRevealed((prev) => ({ ...prev, [k]: new Set() }))
  }

  const toggleMemo = (s: number) => {
    const k = year + '-' + s
    const on = !memo.has(k)
    setMemo((prev) => {
      const n = new Set(prev)
      if (on) n.add(k)
      else n.delete(k)
      return n
    })
    api('/subjmemo', { method: 'POST', body: JSON.stringify({ year, seq: s, on }) }).catch(() => undefined)
  }

  const randomNext = async () => {
    try {
      const sy = await api<{ years: { year: number; n: number }[] }>('/real/subjective/years')
      const pool: [number, number][] = []
      for (const y of sy.years)
        for (let s = 34; s < 34 + y.n; s++) if (!memo.has(y.year + '-' + s)) pool.push([y.year, s])
      if (!pool.length) {
        for (const y of sy.years) for (let s = 34; s < 34 + y.n; s++) pool.push([y.year, s])
        toast(`全部已背完，抽一道复习 🎉`, true)
      }
      const [ry, rs] = pool[Math.floor(Math.random() * pool.length)]
      nav(`realsubj/${ry}-${rs}`)
    } catch {
      /* ignore */
    }
  }

  const anyDone = d.questions.some((q) => memo.has(year + '-' + q.seq))
  const anyUndone = d.questions.some((q) => !memo.has(year + '-' + q.seq))

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          <span className="font-num">{d.year}</span> 分析题背诵
          <span className="ml-2 align-middle rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-semibold text-rose-600">
            先想再看要点
          </span>
        </h1>
        <span className="flex items-center gap-3 whitespace-nowrap">
          <Button variant="outline" size="chip" className="hidden sm:inline-flex" onClick={() => printSubj(d)}>
            <Printer size={12} /> 打印背诵版
          </Button>
          <button onClick={() => nav('realsubjlist')} className="text-sm text-ink-2 hover:text-brand-600">
            ← 返回分析题
          </button>
        </span>
      </div>
      <p className="mt-1 text-xs text-ink-3">
        看完材料和设问先自己梳理思路，再展开参考要点对照；要点为原创整理，以官方《考试分析》为准。
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {d.questions.map((q) => {
          const done = memo.has(year + '-' + q.seq)
          return (
            <button
              key={q.seq}
              onClick={() => document.getElementById('subj-' + q.seq)?.scrollIntoView({ behavior: 'smooth' })}
              className={`btn-press inline-flex min-h-[32px] items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium font-num ${done ? 'border-ok-100 bg-ok-50 text-ok-600' : 'border-black/5 bg-white text-ink-2 hover:border-rose-300 hover:text-rose-600'}`}
            >
              {q.seq}
              {done ? ' ✓' : ''}
            </button>
          )
        })}
      </div>
      {anyDone && anyUndone ? (
        <label className="mt-2 inline-flex min-h-[32px] cursor-pointer select-none items-center gap-1.5 text-xs text-ink-2">
          <input type="checkbox" className="h-3.5 w-3.5 accent-rose-500" checked={onlyUnmemo} onChange={(e) => setOnlyUnmemo(e.target.checked)} />
          只看未背的题
        </label>
      ) : null}
      <div className="mt-4 space-y-3">
        {d.questions.map((q) => {
          const k = year + '-' + q.seq
          const done = memo.has(k)
          if (onlyUnmemo && done) return null
          const st = subjStem(q)
          const h = hits[k]
          const sel = new Set(h?.sel || [])
          return (
            <Card key={q.seq} id={'subj-' + q.seq} className="scroll-mt-20 p-4">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-semibold font-num text-rose-600">
                  {q.seq}
                </span>
                <div className="min-w-0 flex-1 lg:grid lg:grid-cols-2 lg:gap-x-6">
                  <div className="lg:self-start">
                  {st.length > 320 ? (
                    <>
                      <details className="lg:hidden">
                        <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                          <span className="[details[open]_&]:hidden">
                            <span className="text-sm leading-6 text-ink">{st.slice(0, 200).trim()}…</span>{' '}
                            <span className="whitespace-nowrap text-xs font-medium text-ink-2">展开全部材料 ›</span>
                          </span>
                        </summary>
                        <p className="whitespace-pre-line text-sm leading-6 text-ink">{st}</p>
                      </details>
                      <p className="hidden whitespace-pre-line text-sm leading-6 text-ink lg:block">{st}</p>
                    </>
                  ) : (
                    <p className="whitespace-pre-line text-sm leading-6 text-ink">{st}</p>
                  )}
                  </div>
                  <div className="min-w-0">
                  {q.questions.length ? (
                    <div className="mt-2 space-y-1">
                      {q.questions.map((sq, qi) => (
                        <p key={qi} className="text-sm font-medium leading-6 text-ink-2">
                          ({qi + 1}) {sq}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  <details className="mt-2.5 overflow-hidden rounded-xl bg-page">
                    <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-semibold text-brand-600 hover:bg-black/5 [&::-webkit-details-marker]:hidden">
                      展开参考答案要点（{q.answer_points.length} 条）›
                      {h ? (
                        <span className={`ml-1 font-normal font-num ${h.n / h.t >= 0.7 ? 'text-ok-600' : 'text-amber-600'}`}>
                          上次想到 {h.n}/{h.t}
                        </span>
                      ) : null}
                    </summary>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3">
                      <p className="text-[11px] text-ink-3">
                        {cloze.has(k) ? '先回忆再点要点揭开，揭开后再点标记想到' : '点一下你刚才想到的要点，自评背诵命中'}
                      </p>
                      <button
                        onClick={() => toggleCloze(k)}
                        className={`inline-flex min-h-[28px] items-center rounded-full border px-2 text-[11px] font-medium ${cloze.has(k) ? 'border-brand-200 bg-brand-50 text-brand-600' : 'border-black/10 text-ink-3 hover:text-brand-600'}`}
                      >
                        {cloze.has(k) ? '✓ 挖空自测中' : '挖空自测'}
                      </button>
                    </div>
                    <ul className="mt-1.5 space-y-1.5 px-3 pb-1 text-xs leading-5">
                      {q.answer_points.map((pt, pi) => {
                        const hidden = cloze.has(k) && !revealed[k]?.has(pi)
                        const cueM = pt.match(/^.{4,24}?[，、：；,:]/)
                        const cue = cueM ? cueM[0] : pt.slice(0, Math.min(10, Math.max(4, Math.floor(pt.length / 3))))
                        return (
                          <li
                            key={pi}
                            onClick={() => {
                              if (hidden)
                                setRevealed((prev) => ({ ...prev, [k]: new Set([...(prev[k] || []), pi]) }))
                              else togglePt(k, pi, q.answer_points.length)
                            }}
                            className={`-mx-2 cursor-pointer rounded-lg border px-2 py-1.5 hover:bg-white ${sel.has(pi) && !hidden ? 'border-ok-100 bg-ok-50 text-ok-700' : 'border-transparent text-ink-2'}`}
                          >
                            {hidden ? (
                              <>
                                <span className="mr-0.5">👁</span> {cue}
                                <span className="select-none rounded bg-black/5 px-1 text-ink-3 blur-[3px]">{pt.slice(cue.length)}</span>
                              </>
                            ) : (
                              <>
                                <span className="mr-0.5">{sel.has(pi) ? '✓' : '○'}</span> {pt}
                              </>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                    <p className="px-3 pb-2.5 text-[11px] text-ink-3">
                      想到 <b className="font-num">{sel.size}</b>/{q.answer_points.length} 条
                    </p>
                  </details>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[11px] text-ink-3">
                    <span>
                      {q.subject || ''}
                      {q.kp_name ? ' · ' + q.kp_name : ''}
                    </span>
                    {q.kp_name ? (
                      <button
                        onClick={() => nav('realsearch/' + encodeURIComponent(q.kp_name!))}
                        className="inline-flex min-h-[32px] items-center text-xs font-medium text-brand-600 underline decoration-dotted underline-offset-2 hover:text-brand-700"
                      >
                        练同考点客观真题 ›
                      </button>
                    ) : null}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <button
                      onClick={() => toggleMemo(q.seq)}
                      className={`btn-press shrink-0 rounded-lg px-4 py-3 text-xs font-semibold ${done ? 'bg-ok-50 text-ok-600' : 'bg-black/5 text-ink-2 hover:bg-black/10'}`}
                    >
                      {done ? '✓ 背会了' : '标为背会了'}
                    </button>
                    {done ? (
                      <button onClick={randomNext} className="btn-press shrink-0 rounded-lg bg-rose-500 px-4 py-3 text-xs font-semibold text-white hover:bg-rose-600">
                        🎲 抽下一道 ›
                      </button>
                    ) : null}
                  </div>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
      <div className="mb-4 mt-6 flex items-center justify-between text-sm">
        <Button variant="outline" size="sm" onClick={() => nav('realsubj/' + (year - 1))}>
          ‹ {year - 1} 年
        </Button>
        <Button variant="rose" size="sm" onClick={randomNext}>
          🎲 随机抽一道背
        </Button>
        <Button variant="outline" size="sm" onClick={() => nav('realsubj/' + (year + 1))}>
          {year + 1} 年 ›
        </Button>
      </div>
    </div>
  )
}

/** 分析题列表页（年份 + 按科目背 + 随机抽背） */
export function SubjListPage() {
  const { toast } = useApp()
  const [years, setYears] = useState<{ year: number; n: number }[] | null>(null)
  const [memo, setMemo] = useState<Set<string>>(new Set())
  const [byKp, setByKp] = useState<{ year: number; seq: number; kp_name: string; subject?: string }[]>([])

  useEffect(() => {
    Promise.all([
      api<{ years: { year: number; n: number }[] }>('/real/subjective/years'),
      api<{ keys?: string[] }>('/subjmemo').catch(() => null),
      api<{ kps?: { year: number; seq: number; kp_name: string; subject?: string }[] }>('/real/subjective/kps').catch(() => null),
    ])
      .then(([sy, m, sk]) => {
        setYears(sy.years)
        setMemo(new Set(m?.keys || []))
        setByKp(sk?.kps || [])
      })
      .catch((e) => toast(e.message))
  }, [toast])

  if (years === null) return <PageSkeleton />
  const total = years.reduce((s, y) => s + y.n, 0)
  const doneN = memo.size

  const randomOne = () => {
    const pool: [number, number][] = []
    for (const y of years) for (let s = 34; s < 34 + y.n; s++) if (!memo.has(y.year + '-' + s)) pool.push([y.year, s])
    const p = pool.length
      ? pool
      : years.flatMap((y) => Array.from({ length: y.n }, (_, i) => [y.year, 34 + i] as [number, number]))
    if (!p.length) return
    const [ry, rs] = p[Math.floor(Math.random() * p.length)]
    nav(`realsubj/${ry}-${rs}`)
  }

  const groups: Record<string, typeof byKp> = {}
  for (const r of byKp) (groups[r.subject || '其他'] = groups[r.subject || '其他'] || []).push(r)
  const order = ['马原·哲学', '马原·政经', '毛中特', '史纲', '思修', '形势与政策']
  const subs = Object.keys(groups).sort((a, b) => {
    const ia = order.findIndex((o) => a.startsWith(o.split('·')[0]))
    const ib = order.findIndex((o) => b.startsWith(o.split('·')[0]))
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          分析题背诵
          <span className="ml-2 align-middle rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-semibold text-rose-600">
            先想再看
          </span>
        </h1>
        <button onClick={() => nav('real')} className="text-sm text-ink-3 hover:text-brand-600">
          ← 刷真题
        </button>
      </div>
      <p className="mt-1 text-sm text-ink-2">
        已背会 <b className="font-num text-rose-600">{doneN}</b>/{total} 道 · 逐条要点自评，背会打 ✓
      </p>
      <Button variant="rose" className="mt-3" onClick={randomOne}>
        🎲 随机抽一道背 ›
      </Button>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {years.map((y) => {
          const done = Array.from({ length: y.n }, (_, i) => 34 + i).filter((s) => memo.has(y.year + '-' + s)).length
          return (
            <Card key={y.year} className="card-hover p-0">
              <button onClick={() => nav('realsubj/' + y.year)} className="w-full p-4 text-left">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-extrabold font-num">
                    {y.year}
                    <span className="ml-1.5 text-xs font-normal text-ink-3">{y.n} 道分析题</span>
                  </p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium font-num ${done >= y.n ? 'bg-ok-50 text-ok-600' : 'bg-page text-ink-3'}`}>
                    已背 {done}/{y.n}
                  </span>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-black/5">
                  <div className="h-full bg-rose-500" style={{ width: `${(done / y.n) * 100}%` }} />
                </div>
              </button>
            </Card>
          )
        })}
      </div>
      {subs.length ? (
        <>
          <h2 className="mt-6 flex items-center gap-2 text-sm font-bold">
            <span className="inline-block h-4 w-1.5 rounded bg-rose-500" />
            按科目背 <span className="text-xs font-normal text-ink-3">同科目分析题集中背，✓ 为已背会</span>
          </h2>
          {subs.map((sub, gi) => {
            const rs = groups[sub]
            const done = rs.filter((r) => memo.has(r.year + '-' + r.seq)).length
            return (
              <details
                key={sub}
                open={gi === 0}
                className="mt-3 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card"
                style={{ borderLeft: `4px solid ${subjColor(sub)}` }}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-page [&::-webkit-details-marker]:hidden">
                  {sub}
                  <span className="text-xs font-normal font-num text-ink-2">
                    已背 {done}/{rs.length}
                  </span>
                </summary>
                <div className="flex flex-wrap gap-2 px-4 pb-4">
                  {rs.map((r) => (
                    <button
                      key={`${r.year}-${r.seq}`}
                      onClick={() => nav(`realsubj/${r.year}-${r.seq}`)}
                      className={`btn-press min-h-[32px] rounded-full border px-3 py-1.5 text-xs ${memo.has(r.year + '-' + r.seq) ? 'border-ok-100 bg-ok-50 text-ok-600' : 'border-black/5 bg-page text-ink-2 hover:border-rose-300 hover:text-rose-600'}`}
                    >
                      <span className="font-num font-semibold">
                        {r.year}-{r.seq}
                      </span>{' '}
                      {r.kp_name}
                      {memo.has(r.year + '-' + r.seq) ? ' ✓' : ''}
                    </button>
                  ))}
                </div>
              </details>
            )
          })}
        </>
      ) : null}
    </div>
  )
}
