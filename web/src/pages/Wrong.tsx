import { useCallback, useEffect, useMemo, useState } from 'react'
import { Printer, Search, Star } from 'lucide-react'
import { api } from '@/lib/api'
import { useApp } from '@/lib/store'
import { nav } from '@/lib/router'
import { Button, Card, Chip, PageSkeleton } from '@/components/ui'
import type { WrongQ } from '@/lib/types'
import { fmtDate, subjColor, subjTextColor } from '@/lib/utils'
import { exportApkg } from '@/lib/anki'

function printHtml(html: string) {
  let pa = document.getElementById('printArea')
  if (!pa) {
    pa = document.createElement('div')
    pa.id = 'printArea'
    document.body.appendChild(pa)
  }
  pa.innerHTML = html
  window.print()
}

const esc = (s: string) =>
  (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function printWrongList(list: WrongQ[]) {
  printHtml(
    `<div style="max-width:720px;margin:0 auto;font-size:14px;line-height:1.7"><h1 style="font-size:18px;font-weight:800">错题本（${list.length} 道）· 真题工坊</h1>` +
      list
        .map(
          (q, i) =>
            `<div style="margin-top:14px;padding:12px;border:1px solid #ddd;border-radius:8px;break-inside:avoid"><p style="font-weight:600">${i + 1}. ${q.qtype === 'multi' ? '（多选）' : ''}${esc(q.stem)}</p><p>A. ${esc(q.opt_a)}<br>B. ${esc(q.opt_b)}<br>C. ${esc(q.opt_c)}<br>D. ${esc(q.opt_d)}</p><p style="margin-top:6px"><b>答案：${esc(q.answer)}</b>${q.your_answer ? `（你当时选：${esc(q.your_answer)}）` : ''}${q.knowledge_point ? ` · ${esc(q.knowledge_point)}` : ''}</p><p style="margin-top:4px;color:#475569">${esc(q.analysis || '')}</p></div>`
        )
        .join('') +
      `</div>`
  )
}

export function WrongPage() {
  const { me, toast } = useApp()
  const [qs, setQs] = useState<WrongQ[] | null>(null)
  const [favQs, setFavQs] = useState<WrongQ[]>([])
  const [f, setF] = useState<'due' | 'all' | 'fav'>('all')
  const [sub, setSub] = useState('')
  const [kw, setKw] = useState('')
  const [flags, setFlags] = useState<Record<number, string>>({})
  const [flagOpen, setFlagOpen] = useState<number | null>(null)
  const [flagDetail, setFlagDetail] = useState('')
  const [confirmDel, setConfirmDel] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      const [d, favd] = await Promise.all([
        api<{ questions: WrongQ[] }>('/wrongbook'),
        api<{ questions: WrongQ[] }>('/favorites').catch(() => ({ questions: [] as WrongQ[] })),
      ])
      setQs(d.questions)
      setFavQs(favd.questions || [])
      setF(d.questions.some((q) => q.due) ? 'due' : 'all')
    } catch (e) {
      toast((e as Error).message)
      setQs([])
    }
  }, [toast])

  useEffect(() => {
    load()
    api<{ flags?: Record<number, string> }>('/flags')
      .then((d) => setFlags(d.flags || {}))
      .catch(() => undefined)
  }, [load])

  const list = useMemo(() => {
    if (!qs) return []
    let l: WrongQ[] = f === 'fav' ? favQs : f === 'due' ? qs.filter((q) => q.due) : qs
    if (sub) l = l.filter((q) => q.subject === sub)
    if (kw)
      l = l.filter((q) =>
        (q.stem + ' ' + (q.knowledge_point || '') + ' ' + (q.analysis || ''))
          .toLowerCase()
          .includes(kw.toLowerCase())
      )
    return l
  }, [qs, favQs, f, sub, kw])

  const topWrongKps = useMemo(() => {
    const cnt: Record<string, number> = {}
    for (const q of qs || []) if (q.knowledge_point) cnt[q.knowledge_point] = (cnt[q.knowledge_point] || 0) + 1
    return Object.entries(cnt)
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
  }, [qs])

  const favIds = useMemo(() => new Set(favQs.map((q) => q.id)), [favQs])

  // 未来 7 天到期分布（记忆曲线可视化）：今日到期 + 后 6 天预告
  const dueDist = useMemo(() => {
    const b = Array(7).fill(0) as number[]
    for (const q of qs || []) {
      if (q.due) b[0]++
      else if (q.due_at) {
        const t = new Date(q.due_at.replace(' ', 'T') + 'Z').getTime()
        const d = Math.ceil((t - Date.now()) / 86400000)
        if (d >= 1 && d <= 6) b[d]++
      }
    }
    return b
  }, [qs])

  if (qs === null) return <PageSkeleton />
  const subs = [...new Set(qs.map((q) => q.subject).filter(Boolean))] as string[]

  const removeWrong = async (id: number) => {
    setConfirmDel(null)
    try {
      await api('/wrongbook/' + id, { method: 'DELETE' })
      setQs((l) => (l || []).filter((x) => x.id !== id))
      toast('已移出错题本')
    } catch (e) {
      toast((e as Error).message)
    }
  }

  const toggleFav = async (q: WrongQ) => {
    try {
      if (favIds.has(q.id)) {
        await api('/favorites/' + q.id, { method: 'DELETE' })
        setFavQs((l) => l.filter((x) => x.id !== q.id))
        toast('已取消收藏')
      } else {
        await api('/favorites', { method: 'POST', body: JSON.stringify({ question_id: q.id }) })
        setFavQs((l) => [{ ...q }, ...l])
        toast('已收藏，可在「⭐ 收藏」筛选中查看', true)
      }
    } catch (e) {
      toast((e as Error).message)
    }
  }

  const submitFlag = async (qid: number, reason: string) => {
    try {
      await api(`/questions/${qid}/flag`, {
        method: 'POST',
        body: JSON.stringify({ reason, detail: flagDetail.trim().slice(0, 200) || undefined }),
      })
      setFlags((m) => ({ ...m, [qid]: reason }))
      setFlagOpen(null)
      setFlagDetail('')
    } catch (e) {
      toast((e as Error).message)
    }
  }

  const startPractice = () => {
    let all = qs.slice()
    if (sub) {
      const s = all.filter((q) => q.subject === sub)
      if (s.length) all = s
      else return toast('该科目当前无错题')
    }
    if (!all.length) return toast('错题本是空的')
    const due = all.filter((q) => q.due).sort(() => Math.random() - 0.5)
    const pq = due.length ? due : all.sort(() => Math.random() - 0.5)
    if (!due.length) toast('今日复习已清，本轮为自由加练', true)
    sessionStorage.setItem('zt_prac', JSON.stringify({ uid: me?.id, qs: pq, i: 0, right: 0 }))
    nav('practice')
  }

  return (
    <div className="pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">错题本（{qs.length}）</h1>
        <div className="flex flex-wrap gap-2">
          {qs.length ? (
            <>
              <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => printWrongList(list)}>
                <Printer size={14} /> 打印错题
              </Button>
              <Button size="sm" onClick={startPractice}>
                {sub ? `重练「${sub}」` : '错题重练'}
              </Button>
              {me?.pro ? (
                <Button size="sm" onClick={() => exportApkg(qs, toast)}>
                  导出 Anki .apkg
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => nav('account')}>
                  🔒 导出 Anki（会员）
                </Button>
              )}
            </>
          ) : null}
        </div>
      </div>
      {qs.length && dueDist.some((n) => n > 0) ? (
        <div className="mt-4 rounded-2xl border border-black/5 bg-white p-3 shadow-card">
          <p className="text-xs font-semibold text-ink-3">未来 7 天待复习分布</p>
          <div className="mt-3 flex items-end gap-1.5" style={{ height: 52 }}>
            {dueDist.map((n, di) => {
              const max = Math.max(...dueDist, 1)
              return (
                <div key={di} className="flex flex-1 flex-col items-center gap-0.5">
                  <span className="text-[11px] font-num font-medium text-ink-2">{n || ''}</span>
                  <div
                    className={`w-full max-w-[28px] rounded-t ${di === 0 ? 'bg-rose-400' : 'bg-brand-200'}`}
                    style={{ height: Math.max(2, (n / max) * 26) }}
                  />
                  <span className="text-[10px] text-ink-3">{di === 0 ? '今日' : `+${di}天`}</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <Chip active={f === 'due'} onClick={() => setF('due')}>
          今日复习（{(sub ? qs.filter((q) => q.subject === sub) : qs).filter((q) => q.due).length}）
        </Chip>
        <Chip active={f === 'all'} onClick={() => setF('all')}>
          全部（{(sub ? qs.filter((q) => q.subject === sub) : qs).length}）
        </Chip>
        <Chip active={f === 'fav'} onClick={() => setF('fav')}>
          ⭐ 收藏（{(sub ? favQs.filter((q) => q.subject === sub) : favQs).length}）
        </Chip>
        <span className="relative ml-auto">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            placeholder="搜题干 / 考点关键词"
            className="w-44 rounded-full border border-black/10 py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 sm:w-56"
          />
        </span>
      </div>
      {subs.length > 1 ? (
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Chip active={!sub} onClick={() => setSub('')}>
            全部科目
          </Chip>
          {subs.map((s) => (
            <Chip key={s} active={sub === s} onClick={() => setSub(s)}>
              {s}
            </Chip>
          ))}
        </div>
      ) : null}
      {topWrongKps.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border border-rose-100 bg-rose-50/60 px-4 py-3 text-xs">
          <span className="font-semibold text-ink-2">错得最多的考点：</span>
          {topWrongKps.map(([k, n]) => (
            <button
              key={k}
              onClick={() => nav('realsearch/' + encodeURIComponent(k))}
              className="inline-flex min-h-[32px] items-center font-medium text-rose-600 underline decoration-dotted underline-offset-2 hover:text-rose-700"
            >
              {k}（{n} 错）· 练真题 ›
            </button>
          ))}
        </div>
      ) : null}
      <div className="mt-3 space-y-3">
        {list.length ? (
          list.map((q) => (
            <details
              key={q.id}
              className="overflow-hidden rounded-2xl border border-black/5 bg-white text-sm shadow-card"
              style={{ borderLeft: `4px solid ${subjColor(q.subject)}` }}
            >
              <summary className="flex cursor-pointer items-start justify-between gap-2 p-4">
                <p className="font-medium">
                  {q.qtype === 'multi' ? (
                    <span className="mr-1.5 inline-block rounded bg-violet-100 px-1.5 py-0.5 align-middle text-[11px] font-semibold text-violet-600">
                      多选
                    </span>
                  ) : null}
                  {q.stem}
                </p>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  {f === 'fav' ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-600">
                      收藏于 {fmtDate(q.created_at)}
                    </span>
                  ) : (
                    <span className={`rounded-full px-2 py-0.5 text-xs ${q.due ? 'bg-rose-50 font-medium text-rose-500' : 'bg-black/5 text-ink-3'}`}>
                      {q.due ? '今日复习' : `复习中 ${(q.box || 1) - 1}/4`}
                    </span>
                  )}
                  {q.subject ? (
                    <span
                      className="rounded-full bg-white px-2 py-0.5 text-[11px]"
                      style={{ border: `1px solid ${subjColor(q.subject)}66`, color: subjTextColor(q.subject) }}
                    >
                      {q.subject}
                    </span>
                  ) : null}
                </span>
              </summary>
              <div className="px-4 pb-4">
                <div className="space-y-0.5 text-ink-2">
                  <p>A. {q.opt_a}</p>
                  <p>B. {q.opt_b}</p>
                  <p>C. {q.opt_c}</p>
                  <p>D. {q.opt_d}</p>
                </div>
                {q.your_answer ? <p className="mt-2 text-xs text-rose-500">你当时选了：{q.your_answer}</p> : null}
                <p className="mt-2 font-medium text-emerald-600">答案：{q.answer}</p>
                <p className="mt-1 leading-6 text-ink-2">{q.analysis}</p>
                <span className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => toggleFav(q)}
                    className={`inline-flex min-h-[32px] items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${favIds.has(q.id) ? 'pop border-amber-300 bg-amber-50 font-medium text-amber-600' : 'border-black/10 text-ink-2 hover:border-amber-300 hover:text-amber-600'}`}
                  >
                    <Star size={13} className={favIds.has(q.id) ? 'fill-amber-400 text-amber-400' : ''} />
                    {favIds.has(q.id) ? '已收藏' : '收藏'}
                  </button>
                  {q.knowledge_point ? (
                    <Button variant="roseSoft" size="chip" onClick={() => nav('realsearch/' + encodeURIComponent(q.knowledge_point!))}>
                      练同考点真题 ›
                    </Button>
                  ) : null}
                  {f !== 'fav' ? (
                    confirmDel === q.id ? (
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <button onClick={() => removeWrong(q.id)} className="min-h-[32px] rounded-full bg-rose-500 px-3 py-1.5 font-medium text-white">
                          确认移出
                        </button>
                        <button onClick={() => setConfirmDel(null)} className="min-h-[32px] px-2 py-1.5 text-ink-3 underline underline-offset-2">
                          取消
                        </button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmDel(q.id)} className="min-h-[32px] px-2.5 py-1.5 text-xs text-rose-600/70 underline underline-offset-2 hover:rounded-full hover:bg-rose-50 hover:text-rose-600">
                        移出错题本
                      </button>
                    )
                  ) : null}
                  {flags[q.id] ? (
                    <span className="text-xs text-emerald-600">已反馈「{flags[q.id]}」，感谢帮助我们提升题库质量</span>
                  ) : flagOpen === q.id ? (
                    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-ink-2">
                      哪里有问题？
                      {['答案存疑', '选项有误', '解析不清', '题干歧义', '其他'].map((r) => (
                        <button
                          key={r}
                          onClick={() => submitFlag(q.id, r)}
                          className="rounded-full border border-black/10 px-2 py-0.5 hover:border-rose-300 hover:text-rose-500"
                        >
                          {r}
                        </button>
                      ))}
                      <input
                        value={flagDetail}
                        onChange={(e) => setFlagDetail(e.target.value)}
                        maxLength={200}
                        placeholder="描述具体问题（选填）"
                        className="min-w-0 rounded-lg border border-black/10 px-2 py-1 text-xs focus:outline-none focus:border-brand-500"
                      />
                    </span>
                  ) : (
                    <button onClick={() => setFlagOpen(q.id)} className="min-h-[32px] px-2.5 py-1.5 text-xs text-ink-2 underline underline-offset-2 hover:text-rose-500">
                      报错
                    </button>
                  )}
                </span>
              </div>
            </details>
          ))
        ) : f === 'fav' ? (
          <div className="py-12 text-center">
            <p className="text-3xl">⭐</p>
            <p className="mt-2 text-sm text-ink-2">还没有收藏题目——展开错题卡点「⭐ 收藏」即可把题目收进这里</p>
          </div>
        ) : qs.length ? (
          <p className="py-10 text-center text-sm text-ink-3">
            {kw ? `没有匹配「${kw}」的错题` : sub ? '该科目当前无错题' : '今日复习已清，明天再来 🎉'}
          </p>
        ) : (
          <div className="py-12 text-center">
            <p className="text-3xl">📘</p>
            <p className="mt-2 text-sm text-ink-2">错题本还是空的——做完一份卷，错题会自动进入这里循环复习</p>
            <Button size="lg" className="mt-4" onClick={() => nav('real')}>
              去做一份真题卷
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

interface PracState {
  uid?: number
  qs: WrongQ[]
  i: number
  right: number
  missed?: number[]
  grad?: number
}

export function PracticePage() {
  const { toast } = useApp()
  const [P, setP] = useState<PracState | null>(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem('zt_prac') || 'null')
      return s && s.qs && s.i < s.qs.length ? s : null
    } catch {
      return null
    }
  })
  const [sel, setSel] = useState<string[]>([])
  const [answered, setAnswered] = useState<string | null>(null)
  const [fb, setFb] = useState('')
  const [combo, setCombo] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!P && !done) nav('wrong')
  }, [P, done])

  const answer = useCallback(
    (k: string) => {
      if (!P || answered) return
      const q = P.qs[P.i]
      const correct = k === q.answer
      const next = { ...P, right: P.right + (correct ? 1 : 0), missed: correct ? P.missed || [] : [...(P.missed || []), P.i] }
      setP(next)
      setAnswered(k)
      setCombo((c) => (correct ? c + 1 : 0))
      setFb('')
      api<{ graduated?: boolean; next_days?: number }>(`/wrongbook/${q.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ correct }),
      })
        .then((d) => {
          if (d.graduated) {
            setFb('🎓 连续答对多次，已自动移出错题本')
            setP((p) => (p ? { ...p, grad: (p.grad || 0) + 1 } : p))
          } else if (correct && d.next_days) setFb(`${d.next_days} 天后再复习这道题`)
        })
        .catch(() => undefined)
    },
    [P, answered]
  )

  const nextQ = useCallback(() => {
    if (!P) return
    if (P.i + 1 < P.qs.length) {
      const next = { ...P, i: P.i + 1 }
      setP(next)
      setSel([])
      setAnswered(null)
      setFb('')
      sessionStorage.setItem('zt_prac', JSON.stringify(next))
      window.scrollTo(0, 0)
    } else {
      sessionStorage.removeItem('zt_prac')
      setDone(true)
    }
  }, [P])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (!P || done) return
      const q = P.qs[P.i]
      const k = e.key.toUpperCase()
      if (!answered && ['A', 'B', 'C', 'D'].includes(k)) {
        if (q.qtype === 'multi') setSel((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]))
        else answer(k)
      } else if (!answered && q.qtype === 'multi' && e.key === 'Enter' && sel.length) {
        answer([...sel].sort().join(''))
        setSel([])
      } else if (answered && (e.key === 'Enter' || e.key === 'ArrowRight')) nextQ()
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [P, answered, sel, done, answer, nextQ])

  if (done && P) {
    const pct = Math.round((P.right / P.qs.length) * 100)
    const missedQs = (P.missed || []).map((mi) => P.qs[mi]).filter(Boolean)
    const missedKps = [...new Set(missedQs.map((mq) => mq.knowledge_point).filter(Boolean))]
    return (
      <div className="py-14 text-center">
        <p className="text-4xl">{pct >= 80 ? '🎉' : '💪'}</p>
        <h1 className="mt-3 text-2xl font-bold">
          重练完成：答对 {P.right} / {P.qs.length}
        </h1>
        <p className="mt-2 text-sm text-ink-2">
          {pct >= 80 ? '很稳！继续保持，把剩下的错题也拿下' : '错题还没完全掌握，明天再练一轮'}
          {P.grad ? ` · 🎓 本轮 ${P.grad} 题毕业移出错题本` : ''}
        </p>
        {missedKps.length ? (
          <p className="mx-auto mt-3 max-w-md text-xs leading-5 text-ink-3">
            本轮仍错考点：{missedKps.slice(0, 5).join('、')}
            {missedKps.length > 5 ? ` 等 ${missedKps.length} 个` : ''}
          </p>
        ) : null}
        <div className="mt-6 flex justify-center gap-3">
          {missedQs.length ? (
            <Button
              onClick={() => {
                const next: PracState = { uid: P.uid, qs: missedQs, i: 0, right: 0 }
                sessionStorage.setItem('zt_prac', JSON.stringify(next))
                setP(next)
                setSel([])
                setAnswered(null)
                setFb('')
                setCombo(0)
                setDone(false)
                window.scrollTo(0, 0)
              }}
            >
              只重练刚错的 {missedQs.length} 题
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => nav('wrong')}>
            回错题本
          </Button>
        </div>
      </div>
    )
  }
  if (!P) return null
  const q = P.qs[P.i]
  const opts: [string, string][] = [
    ['A', q.opt_a],
    ['B', q.opt_b],
    ['C', q.opt_c],
    ['D', q.opt_d],
  ]

  const master = async () => {
    try {
      await api('/wrongbook/' + q.id, { method: 'DELETE' })
      toast('已移出错题本')
    } catch (e) {
      toast((e as Error).message)
    }
    nextQ()
  }

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">错题重练</h1>
        <span className="text-sm font-num text-ink-3">
          第 {P.i + 1} / {P.qs.length} 题 · 答对 {P.right}
        </span>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-black/5">
        <div className="h-full bg-brand-500" style={{ width: `${((P.i + (answered ? 1 : 0)) / P.qs.length) * 100}%` }} />
      </div>
      <Card className="mt-4 p-5">
        <p className="font-medium leading-relaxed">
          {q.qtype === 'multi' ? (
            <span className="mr-1.5 inline-block rounded bg-violet-100 px-1.5 py-0.5 align-middle text-[11px] font-semibold text-violet-600">
              多选
            </span>
          ) : null}
          {q.stem}
        </p>
        <div className="mt-4 space-y-2">
          {opts.map(([k, v]) => {
            let cls = 'border-black/10'
            if (answered) {
              if (q.answer.includes(k)) cls = 'border-emerald-500 bg-emerald-50'
              else if (answered.includes(k)) cls = 'border-rose-400 bg-rose-50'
            }
            const psel = !answered && q.qtype === 'multi' && sel.includes(k)
            return (
              <button
                key={k}
                disabled={!!answered}
                onClick={() =>
                  q.qtype === 'multi'
                    ? setSel((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]))
                    : answer(k)
                }
                className={`opt-btn flex w-full gap-3 rounded-xl border px-4 py-3 text-left text-sm ${cls} ${psel ? 'sel' : ''}`}
              >
                <span className="opt-badge grid h-6 w-6 shrink-0 place-items-center rounded-full bg-black/5 text-xs font-bold">
                  {k}
                </span>
                <span>{v}</span>
              </button>
            )
          })}
        </div>
        {!answered && q.qtype === 'multi' ? (
          <Button
            className="mt-4 w-full"
            disabled={!sel.length}
            onClick={() => {
              answer([...sel].sort().join(''))
              setSel([])
            }}
          >
            确认答案{sel.length ? `（已选 ${[...sel].sort().join('')}）` : ''}
          </Button>
        ) : null}
        {answered ? (
          <>
            <div className={`mt-4 rounded-xl p-4 text-sm animate-[ztfbpop_.35s_cubic-bezier(.2,1.4,.4,1)] ${answered === q.answer ? 'bg-emerald-50' : 'bg-rose-50'}`}>
              <style>{`@keyframes ztfbpop{0%{transform:scale(.92);opacity:.4}100%{transform:scale(1);opacity:1}}`}</style>
              <p className={`font-medium ${answered === q.answer ? 'text-emerald-700' : 'text-rose-600'}`}>
                {answered === q.answer ? '✓ 答对了！' : `✗ 答错了，正确答案：${q.answer}`}
                {answered === q.answer && combo >= 2 ? <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 font-num">连对 {combo} 题 🔥</span> : null}
                {fb ? <span className="ml-2 text-xs font-normal text-emerald-600">{fb}</span> : null}
              </p>
              <p className="mt-1 text-xs text-brand-600">考点：{q.knowledge_point}</p>
              <p className="mt-2 leading-relaxed text-ink-2">{q.analysis}</p>
              {answered === q.answer ? (
                <button onClick={master} className="mt-3 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white">
                  已掌握，移出错题本
                </button>
              ) : null}
            </div>
            <Button className="mt-4 w-full" onClick={nextQ}>
              {P.i + 1 < P.qs.length ? '下一题 →' : '完成练习'}
            </Button>
          </>
        ) : null}
      </Card>
      <Button
        variant="outline"
        size="sm"
        className="mt-4"
        onClick={() => {
          sessionStorage.removeItem('zt_prac')
          nav('wrong')
        }}
      >
        ← 退出重练
      </Button>
      <p className="mt-1 text-xs text-ink-3">快捷键：A-D 选择，回车/→ 下一题</p>
    </div>
  )
}
