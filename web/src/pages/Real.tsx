import { useEffect, useMemo, useState } from 'react'
import { Search, Star, Zap } from 'lucide-react'
import { api } from '@/lib/api'
import { useApp } from '@/lib/store'
import { nav, safeDec } from '@/lib/router'
import { Button, Card, Chip, PageSkeleton } from '@/components/ui'
import type { Question } from '@/lib/types'
import { subjColor } from '@/lib/utils'

interface YearRow {
  year: number
  n: number
  done?: boolean
  score?: number
  total?: number
  in_progress?: boolean
}
interface KpRow {
  kp_name: string
  n: number
  subject?: string
}

export async function startRealYear(year: number, toast: (m: string) => void) {
  try {
    const d = await api<{ id: number; existed?: boolean }>('/real/paper?year=' + year)
    if (d.existed) {
      const done = await api('/papers/' + d.id + '/result')
        .then(() => true)
        .catch(() => false)
      const saved = JSON.parse(localStorage.getItem('zt_exam_' + d.id) || 'null')
      if (done && !(saved && saved.retake)) return nav('result/' + d.id)
    }
    nav('exam/' + d.id)
  } catch (e) {
    toast((e as Error).message)
  }
}

export function RealPage({ tab }: { tab?: string }) {
  const { toast, confirm } = useApp()
  const [t, setT] = useState(tab || 'year')
  const [years, setYears] = useState<YearRow[] | null>(null)
  const [kps, setKps] = useState<KpRow[] | null>(null)
  const [kpStats, setKpStats] = useState<Map<string, { correct: number; total: number }>>(new Map())
  const [subjYears, setSubjYears] = useState<{ year: number; n: number }[] | null>(null)
  const [memo, setMemo] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  const [kpQ, setKpQ] = useState('')
  const [busy, setBusy] = useState('')

  useEffect(() => {
    if (t === 'year' && !years)
      api<{ years: YearRow[] }>('/real/years')
        .then((d) => setYears(d.years))
        .catch((e) => toast(e.message))
    if (t === 'kp' && !kps) {
      api<{ kps: KpRow[] }>('/real/kps')
        .then((d) => setKps(d.kps))
        .catch((e) => toast(e.message))
      api<{ kps?: { kp: string; correct: number; total: number }[] }>('/kpstats')
        .then((d) => {
          const m = new Map<string, { correct: number; total: number }>()
          for (const k of d.kps || []) m.set(k.kp, k)
          setKpStats(m)
        })
        .catch(() => undefined)
    }
    if (t === 'subj' && !subjYears) {
      api<{ years: { year: number; n: number }[] }>('/real/subjective/years')
        .then((d) => setSubjYears(d.years))
        .catch((e) => toast(e.message))
      api<{ keys?: string[] }>('/subjmemo')
        .then((d) => setMemo(new Set(d.keys || [])))
        .catch(() => undefined)
    }
  }, [t, years, kps, subjYears, toast])

  const kpGroups = useMemo(() => {
    const g: Record<string, KpRow[]> = {}
    for (const k of kps || []) (g[k.subject || '其他'] = g[k.subject || '其他'] || []).push(k)
    return g
  }, [kps])

  const startYear = async (year: number) => {
    setBusy('y' + year)
    await startRealYear(year, toast)
    setBusy('')
  }
  const startKp = async (name: string) => {
    setBusy('k' + name)
    try {
      const d = await api<{ id: number }>('/real/kp?name=' + encodeURIComponent(name))
      nav('exam/' + d.id)
    } catch (e) {
      toast((e as Error).message)
    }
    setBusy('')
  }

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          刷真题
          <span className="ml-2 align-middle rounded bg-ok-50 px-1.5 py-0.5 text-[11px] font-semibold text-ok-600">
            免费不限量
          </span>
        </h1>
        <button onClick={() => nav('home')} className="text-sm text-ink-3 hover:text-brand-600">
          ← 工作台
        </button>
      </div>
      <p className="mt-1 text-sm text-ink-2">
        {t === 'subj'
          ? '历年分析题背参考要点，先想再看、逐条可背'
          : '历年考研政治真题（客观题），做完自动判分，错题进错题本循环复习'}
      </p>
      <div className="mt-4 flex items-center gap-2 text-sm">
        <Chip active={t === 'year'} onClick={() => setT('year')}>
          按年份
        </Chip>
        <Chip active={t === 'kp'} onClick={() => setT('kp')}>
          按考点
        </Chip>
        <Chip active={t === 'subj'} onClick={() => setT('subj')}>
          分析题
        </Chip>
        <Chip onClick={() => nav('realfavs')} title="收藏的真题">
          <Star size={12} className="inline -mt-0.5 text-amber-500" /> 收藏
        </Chip>
        <div className="relative ml-auto min-w-0 flex-1 max-w-56 hidden sm:block">
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && q.trim() && nav('realsearch/' + encodeURIComponent(q.trim()))}
            placeholder="搜真题…"
            className="h-9 w-full rounded-full border border-black/10 bg-white pl-8 pr-3 text-sm placeholder:text-ink-3 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>
      <div className="relative mt-3 sm:hidden">
        <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && q.trim() && nav('realsearch/' + encodeURIComponent(q.trim()))}
          placeholder="搜真题（题干 / 考点 / 解析）…"
          className="h-10 w-full rounded-full border border-black/10 bg-white pl-8 pr-3 text-sm placeholder:text-ink-3 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      {/* 快刷入口 */}
      {t !== 'subj' ? (
        <button
          onClick={() => nav('realrand')}
          className="btn-press card-hover mt-4 flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 p-4 text-left text-white shadow-card"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15">
            <Zap size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">真题乱序快刷 · 随机 20 题</span>
            <span className="mt-0.5 block text-xs text-white/75">全库抽题免费不限量，做完自动判分</span>
          </span>
          <span className="shrink-0 text-white/80">›</span>
        </button>
      ) : null}

      {t === 'year' ? (
        years === null ? (
          <PageSkeleton />
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {years.map((y) => (
              <Card key={y.year} className="card-hover p-4">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-extrabold font-num">
                    {y.year}
                    <span className="ml-1.5 text-xs font-normal text-ink-3">{y.n} 题</span>
                    {y.year >= 2026 ? (
                      <span className="ml-1.5 rounded bg-rose-50 px-1.5 py-0.5 align-middle text-[11px] font-semibold text-rose-600">
                        NEW
                      </span>
                    ) : null}
                  </p>
                  {y.done ? (
                    <span className="rounded-full bg-ok-50 px-2 py-0.5 text-xs font-medium text-ok-600 font-num">
                      {y.score}/{y.total}
                    </span>
                  ) : y.in_progress ? (
                    <span className="rounded-full bg-warn-50 px-2 py-0.5 text-xs font-medium text-warn-600">
                      作答中
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="rose"
                    size="chip"
                    disabled={busy === 'y' + y.year}
                    onClick={async () => {
                      if (
                        y.done ||
                        (await confirm(`开始 ${y.year} 年整卷模考？将直接开卷计时`, '开始模考'))
                      )
                        startYear(y.year)
                    }}
                  >
                    {y.done ? '查看成绩 / 重考' : y.in_progress ? '继续答题 ›' : '整卷模考 ›'}
                  </Button>
                  <Button variant="roseSoft" size="chip" onClick={() => nav('realbrowse/' + y.year)}>
                    背题模式
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : null}

      {t === 'kp' ? (
        kps === null ? (
          <PageSkeleton />
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-ink-3">点考点名即按该考点抽历年真题组卷（免费不占额度）</p>
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
              <input
                type="search"
                value={kpQ}
                onChange={(e) => setKpQ(e.target.value)}
                placeholder="输考点名就地过滤，如“量变”“抗日”…"
                className="h-10 w-full max-w-72 rounded-full border border-black/10 bg-white pl-8 pr-3 text-sm placeholder:text-ink-3 focus:outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              />
            </div>
            {Object.entries(kpGroups)
              .map(([sub, rows]) => [sub, kpQ.trim() ? rows.filter((k) => k.kp_name.includes(kpQ.trim())) : rows] as const)
              .filter(([, rows]) => rows.length > 0)
              .map(([sub, rows]) => (
              <details key={sub} open className="rounded-2xl border border-black/5 bg-white shadow-card overflow-hidden" style={{ borderLeft: `4px solid ${subjColor(sub)}` }}>
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  {sub} <span className="text-xs font-normal text-ink-3">{rows.length} 个考点{kpQ.trim() ? '（已过滤）' : ''}</span>
                </summary>
                <div className="flex flex-wrap gap-2 px-4 pb-4">
                  {rows.map((k) => {
                    const st = kpStats.get(k.kp_name)
                    const pct = st && st.total >= 2 ? Math.round((st.correct / st.total) * 100) : null
                    return (
                      <button
                        key={k.kp_name}
                        disabled={busy === 'k' + k.kp_name}
                        onClick={() => startKp(k.kp_name)}
                        className="btn-press min-h-[40px] sm:min-h-[32px] rounded-full border border-black/5 bg-page px-3 py-1.5 text-xs text-ink-2 hover:border-rose-300 hover:text-rose-600 disabled:opacity-60"
                      >
                        {k.kp_name} <span className="font-num opacity-70">{k.n} 题</span>
                        {pct !== null ? (
                          <span className={`ml-1 font-num font-semibold ${pct < 50 ? 'text-bad-600' : pct <= 70 ? 'text-warn-600' : 'text-ok-600'}`}>
                            {pct}%
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </details>
            ))}
          </div>
        )
      ) : null}

      {t === 'subj' ? (
        subjYears === null ? (
          <PageSkeleton />
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {subjYears.map((y) => {
              const done = Array.from({ length: y.n }, (_, i) => 34 + i).filter((s) =>
                memo.has(y.year + '-' + s)
              ).length
              return (
                <Card key={y.year} className="card-hover p-0">
                  <button onClick={() => nav('realsubj/' + y.year)} className="w-full p-4 text-left">
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-extrabold font-num">
                        {y.year}
                        <span className="ml-1.5 text-xs font-normal text-ink-3">{y.n} 道分析题</span>
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium font-num ${done >= y.n ? 'bg-ok-50 text-ok-600' : 'bg-page text-ink-3'}`}
                      >
                        已背 {done}/{y.n}
                      </span>
                    </div>
                    <div className="mt-2.5 h-1.5 rounded-full bg-black/5 overflow-hidden">
                      <div className="h-full bg-rose-500" style={{ width: `${(done / y.n) * 100}%` }} />
                    </div>
                  </button>
                </Card>
              )
            })}
          </div>
        )
      ) : null}
    </div>
  )
}

/** 真题卡片（背题/搜索/收藏共用） */
export function RealQCard({
  q,
  showYear,
  veiled,
  onReveal,
  fav,
  onFav,
}: {
  q: Question
  showYear?: boolean
  veiled?: boolean
  onReveal?: () => void
  fav?: boolean
  onFav?: () => void
}) {
  const L: Record<string, keyof Question> = { A: 'opt_a', B: 'opt_b', C: 'opt_c', D: 'opt_d' }
  const multi = q.qtype === 'multi' || q.qtype === 'multiple' || q.answer.length > 1
  return (
    <Card className="p-4">
      <div className="flex items-start gap-2">
        {showYear && q.year ? (
          <button
            onClick={() => nav('realbrowse/' + q.year)}
            className="shrink-0 mt-0.5 rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-semibold font-num text-rose-600 hover:bg-rose-100"
            title={`看 ${q.year} 全卷背题`}
          >
            {q.year}·{q.seq} ›
          </button>
        ) : (
          <span className="shrink-0 mt-0.5 rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-semibold font-num text-rose-600">
            {q.seq}
          </span>
        )}
        {multi ? (
          <span className="shrink-0 mt-0.5 rounded bg-brand-50 px-1.5 py-0.5 text-[11px] font-semibold text-brand-600">
            多选
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-6 text-ink">{q.stem}</p>
          <div className="mt-2 space-y-1.5">
            {(['A', 'B', 'C', 'D'] as const).map((o) => (
              <p
                key={o}
                className={`text-sm leading-6 ${!veiled && q.answer.includes(o) ? 'text-ok-700 font-medium' : 'text-ink-2'}`}
              >
                {!veiled && q.answer.includes(o) ? '✓ ' : <span className="inline-block w-3" />} {o}.{' '}
                {q[L[o]] as string}
              </p>
            ))}
          </div>
          {veiled ? (
            <button
              onClick={onReveal}
              className="btn-press mt-2.5 w-full min-h-[36px] rounded-xl border border-dashed border-rose-200 bg-rose-50/50 text-xs font-semibold text-rose-500"
            >
              先想好答案 · 点我显示答案与解析
            </button>
          ) : (
            <div className="mt-2.5 rounded-xl bg-page px-3 py-2.5 text-xs leading-5 text-ink-2">
              <b className="text-ink">
                答案 <span className="font-num text-ok-600">{q.answer}</span>
              </b>
              {q.answer_disputed ? (
                <span className="ml-2 rounded bg-warn-50 px-1 py-0.5 font-medium text-warn-600">
                  该题各机构答案存在分歧，以官方《考试分析》为准
                </span>
              ) : null}
              <br />
              {q.analysis || '解析整理中'}
            </div>
          )}
          <p className="mt-1.5 text-[11px] text-ink-3">
            {q.subject || ''}
            {q.kp_name ? (
              <>
                {' · '}
                <button
                  onClick={() => nav('realsearch/' + encodeURIComponent(q.kp_name!))}
                  className="text-rose-600 underline decoration-dotted underline-offset-2 hover:text-rose-700"
                >
                  {q.kp_name}
                </button>
              </>
            ) : null}
          </p>
        </div>
        {onFav ? (
          <button
            onClick={onFav}
            aria-label={fav ? '取消收藏' : '收藏本题'}
            className={`grid h-8 w-8 shrink-0 -mt-1 place-items-center rounded-full text-lg leading-none transition-colors ${fav ? 'text-amber-500 hover:text-amber-600' : 'text-black/20 hover:text-amber-400'}`}
          >
            {fav ? '★' : '☆'}
          </button>
        ) : null}
      </div>
    </Card>
  )
}

/** 背题模式（按年浏览） */
export function BrowsePage({ year }: { year: number }) {
  const { toast } = useApp()
  const [qs, setQs] = useState<Question[] | null>(null)
  const [veil, setVeil] = useState(false)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [sub, setSub] = useState('')
  const [favs, setFavs] = useState<Set<number>>(new Set())

  useEffect(() => {
    setQs(null)
    setRevealed(new Set())
    api<{ questions: Question[] }>('/real/browse?year=' + year)
      .then((d) => setQs(d.questions))
      .catch((e) => toast(e.message))
    api<{ questions?: Question[] }>('/realfav')
      .then((d) => setFavs(new Set((d.questions || []).map((x) => x.id))))
      .catch(() => undefined)
  }, [year, toast])

  const toggleFav = async (id: number) => {
    try {
      if (favs.has(id)) {
        await api('/realfav/' + id, { method: 'DELETE' })
        setFavs((s) => {
          const n = new Set(s)
          n.delete(id)
          return n
        })
        toast('已取消收藏')
      } else {
        await api('/realfav', { method: 'POST', body: JSON.stringify({ id }) })
        setFavs((s) => new Set(s).add(id))
        toast('已收藏，在刷真题「⭐ 收藏」随时回看', true)
      }
    } catch (e) {
      toast((e as Error).message)
    }
  }

  if (qs === null) return <PageSkeleton />
  const subs = [...new Set(qs.map((x) => x.subject).filter(Boolean))] as string[]
  const list = sub ? qs.filter((x) => x.subject === sub) : qs

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          <span className="font-num">{year}</span> 真题背题
          <span className="ml-2 align-middle rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-semibold text-rose-600">
            答案解析直接看
          </span>
        </h1>
        <button onClick={() => nav('real')} className="text-sm text-ink-3 hover:text-brand-600">
          ← 返回刷真题
        </button>
      </div>
      <p className="mt-1 text-xs text-ink-3">背题模式不判分、不进错题本；想检验掌握程度请回列表整卷模考。</p>
      <label className="mt-2 inline-flex min-h-[32px] cursor-pointer select-none items-center gap-1.5 text-xs text-ink-2">
        <input type="checkbox" className="accent-rose-500" checked={veil} onChange={(e) => setVeil(e.target.checked)} />
        遮住答案先自测（逐题点开揭晓）
      </label>
      {subs.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Chip active={!sub} onClick={() => setSub('')}>
            全部 {qs.length}
          </Chip>
          {subs.map((s) => (
            <Chip key={s} active={sub === s} onClick={() => setSub(s)}>
              {s} {qs.filter((x) => x.subject === s).length}
            </Chip>
          ))}
        </div>
      ) : null}
      <div className="mt-4 space-y-3">
        {list.map((x, i) => (
          <RealQCard
            key={x.id ?? i}
            q={x}
            veiled={veil && !revealed.has(x.id)}
            onReveal={() => setRevealed((s) => new Set(s).add(x.id))}
            fav={favs.has(x.id)}
            onFav={x.id ? () => toggleFav(x.id) : undefined}
          />
        ))}
      </div>
      <div className="mt-6 mb-4 text-center">
        <Button variant="rose" onClick={() => nav('realyear/' + year)}>
          背完了？来一场 {year} 整卷模考 →
        </Button>
      </div>
      <div className="mb-4 flex items-center justify-between text-sm">
        {year > 2010 ? (
          <Button variant="outline" size="sm" onClick={() => nav('realbrowse/' + (year - 1))}>
            ‹ {year - 1} 年背题
          </Button>
        ) : (
          <span />
        )}
        {year < 2026 ? (
          <Button variant="outline" size="sm" onClick={() => nav('realbrowse/' + (year + 1))}>
            {year + 1} 年背题 ›
          </Button>
        ) : (
          <span />
        )}
      </div>
    </div>
  )
}

/** 真题搜索 */
export function SearchPage({ q0 }: { q0: string }) {
  const { toast } = useApp()
  const [data, setData] = useState<{ questions: Question[]; subjective?: { year: number; seq: number; subject?: string; kp_name?: string; brief: string }[] } | null>(null)
  const [kpHit, setKpHit] = useState<KpRow[]>([])
  const [q, setQ] = useState(q0)
  const [favs, setFavs] = useState<Set<number>>(new Set())

  useEffect(() => {
    setQ(q0)
    setData(null)
    api<{ questions: Question[]; subjective?: { year: number; seq: number; subject?: string; kp_name?: string; brief: string }[] }>(
      '/real/search?q=' + encodeURIComponent(q0)
    )
      .then(setData)
      .catch((e) => toast(e.message))
    api<{ kps?: KpRow[] }>('/real/kps')
      .then((d) => setKpHit((d.kps || []).filter((k) => k.kp_name.includes(q0)).slice(0, 3)))
      .catch(() => undefined)
    api<{ questions?: Question[] }>('/realfav')
      .then((d) => setFavs(new Set((d.questions || []).map((x) => x.id))))
      .catch(() => undefined)
  }, [q0, toast])

  const toggleFav = async (id: number) => {
    try {
      if (favs.has(id)) {
        await api('/realfav/' + id, { method: 'DELETE' })
        setFavs((s) => {
          const n = new Set(s)
          n.delete(id)
          return n
        })
      } else {
        await api('/realfav', { method: 'POST', body: JSON.stringify({ id }) })
        setFavs((s) => new Set(s).add(id))
        toast('已收藏', true)
      }
    } catch (e) {
      toast((e as Error).message)
    }
  }

  const startKp = async (name: string) => {
    try {
      const d = await api<{ id: number }>('/real/kp?name=' + encodeURIComponent(name))
      nav('exam/' + d.id)
    } catch (e) {
      toast((e as Error).message)
    }
  }

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">真题搜索</h1>
        <button onClick={() => nav('real')} className="text-sm text-ink-3 hover:text-brand-600">
          ← 返回刷真题
        </button>
      </div>
      <div className="relative mt-3 max-w-sm">
        <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && q.trim() && nav('realsearch/' + encodeURIComponent(q.trim()))}
          placeholder="换个关键词再搜…"
          className="h-9 w-full rounded-full border border-black/10 bg-white pl-8 pr-3 text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </div>
      {kpHit.length ? (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {kpHit.map((k) => (
            <Button key={k.kp_name} variant="roseSoft" size="chip" onClick={() => startKp(k.kp_name)}>
              按考点练：{k.kp_name} <span className="font-num opacity-70">{k.n} 题</span> ›
            </Button>
          ))}
        </div>
      ) : null}
      {data === null ? (
        <PageSkeleton />
      ) : (
        <>
          <p className="mt-2 text-xs text-ink-3">
            「{safeDec(q0)}」命中 {data.questions.length} 道（题干/选项/考点/解析，最多显示 30 道）
          </p>
          {data.questions.length ? (
            <div className="mt-4 space-y-3">
              {data.questions.map((x) => (
                <RealQCard key={x.id} q={x} showYear fav={favs.has(x.id)} onFav={x.id ? () => toggleFav(x.id) : undefined} />
              ))}
            </div>
          ) : (
            <Card className="mt-6 border-dashed p-10 text-center text-sm text-ink-3">
              没搜到相关真题，换个关键词试试
            </Card>
          )}
          {(data.subjective || []).length ? (
            <>
              <h2 className="mt-6 flex items-center gap-2 text-sm font-bold">
                <span className="inline-block h-4 w-1.5 rounded bg-rose-500" />
                相关分析题
                <span className="text-xs font-normal text-ink-3">点击进入该年背诵页</span>
              </h2>
              <div className="mt-3 space-y-3">
                {data.subjective!.map((s) => (
                  <Card key={`${s.year}-${s.seq}`} className="card-hover p-0">
                    <button onClick={() => nav(`realsubj/${s.year}-${s.seq}`)} className="w-full p-4 text-left">
                      <span className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded bg-rose-50 px-1.5 py-0.5 font-semibold font-num text-rose-600">
                          {s.year} 第 {s.seq} 题
                        </span>
                        <span className="text-ink-3">
                          {s.subject || ''}
                          {s.kp_name ? ' · ' + s.kp_name : ''}
                        </span>
                      </span>
                      <span className="mt-1.5 block text-sm leading-6 text-ink-2">{s.brief}…</span>
                    </button>
                  </Card>
                ))}
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  )
}

/** 收藏的真题 */
export function RealFavsPage() {
  const { toast } = useApp()
  const [qs, setQs] = useState<Question[] | null>(null)
  const [favs, setFavs] = useState<Set<number>>(new Set())
  const [sub, setSub] = useState('')

  useEffect(() => {
    api<{ questions: Question[] }>('/realfav')
      .then((d) => {
        setQs(d.questions)
        setFavs(new Set(d.questions.map((x) => x.id)))
      })
      .catch((e) => toast(e.message))
  }, [toast])

  const toggleFav = async (id: number) => {
    try {
      if (favs.has(id)) {
        await api('/realfav/' + id, { method: 'DELETE' })
        setFavs((s) => {
          const n = new Set(s)
          n.delete(id)
          return n
        })
        setQs((l) => (l || []).filter((x) => x.id !== id))
        toast('已取消收藏')
      }
    } catch (e) {
      toast((e as Error).message)
    }
  }

  const startFavPaper = async () => {
    try {
      const d = await api<{ id: number; existed?: boolean }>('/real/favpaper')
      if (d.existed) toast('继续上次未作答的收藏自测卷')
      nav('exam/' + d.id)
    } catch (e) {
      toast((e as Error).message)
    }
  }

  if (qs === null) return <PageSkeleton />
  const subs = [...new Set(qs.map((x) => x.subject).filter(Boolean))] as string[]
  const list = sub ? qs.filter((x) => x.subject === sub) : qs

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          ⭐ 收藏的真题
          <span className="ml-2 align-middle rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold font-num text-amber-600">
            {list.length} 道
          </span>
        </h1>
        <button onClick={() => nav('real')} className="text-sm text-ink-3 hover:text-brand-600">
          ← 返回刷真题
        </button>
      </div>
      {qs.length ? (
        <>
          <div className="mt-3">
            <Button variant="rose" size="chip" onClick={startFavPaper}>
              用收藏的题组卷自测 ›
            </Button>
            <span className="ml-2 text-xs text-ink-3">随机抽 {Math.min(qs.length, 33)} 题，免费不占额度</span>
          </div>
          {subs.length > 1 ? (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Chip active={!sub} onClick={() => setSub('')}>
                全部 {qs.length}
              </Chip>
              {subs.map((s) => (
                <Chip key={s} active={sub === s} onClick={() => setSub(s)}>
                  {s} {qs.filter((x) => x.subject === s).length}
                </Chip>
              ))}
            </div>
          ) : null}
          <div className="mt-4 space-y-3">
            {list.map((x) => (
              <RealQCard key={x.id} q={x} showYear fav={favs.has(x.id)} onFav={() => toggleFav(x.id)} />
            ))}
          </div>
        </>
      ) : (
        <div className="py-12 text-center">
          <p className="text-3xl">⭐</p>
          <p className="mt-2 text-sm text-ink-3">还没有收藏真题——在背题页或搜索结果里点题卡右上角 ☆ 即可收藏</p>
          <Button variant="rose" className="mt-4" onClick={() => nav('real')}>
            去背真题
          </Button>
        </div>
      )}
    </div>
  )
}

/** 快刷组卷跳板 */
export function RandStart() {
  const { toast } = useApp()
  useEffect(() => {
    api<{ id: number; existed?: boolean }>('/real/randpaper')
      .then((d) => {
        if (d.existed) toast('继续上次未作答的快刷卷', true)
        location.hash = 'exam/' + d.id
      })
      .catch((e) => {
        toast(e.message)
        location.hash = 'real'
      })
  }, [toast])
  return <div className="py-16 text-center text-sm text-ink-3">快刷组卷中…</div>
}

/** 整卷模考跳板（intent hash #realyear/2026） */
export function YearStart({ year }: { year: number }) {
  const { toast } = useApp()
  useEffect(() => {
    startRealYear(year, toast)
  }, [year, toast])
  return <div className="py-16 text-center text-sm text-ink-3">{year} 年整卷加载中…</div>
}
