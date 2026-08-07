import { useCallback, useEffect, useRef, useState } from 'react'
import { Flag, Timer } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useApp } from '@/lib/store'
import { nav } from '@/lib/router'
import { Button, Card, PageSkeleton } from '@/components/ui'
import type { Question } from '@/lib/types'
import { cn } from '@/lib/utils'

interface PaperResp {
  paper: { status: string; question_count?: number; fail_reason?: string }
  questions: Question[]
}

interface SavedProgress {
  answers: Record<number, string>
  elapsed?: number
  retake?: boolean
  marks?: number[]
}

export function ExamPage({ pid }: { pid: number }) {
  const { toast, confirm } = useApp()
  const [qs, setQs] = useState<Question[] | null>(null)
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [marks, setMarks] = useState<number[]>([])
  const [start, setStart] = useState(Date.now())
  const [clock, setClock] = useState('--:--')
  const retakeRef = useRef(false)
  const [cardOpen, setCardOpen] = useState(false)
  const [genState, setGenState] = useState<{ n?: number; title?: string } | null>(null)
  const [autoNext, setAutoNext] = useState(() => localStorage.getItem('zt_autonext') === '1')
  const autoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // 全真限时模考：60 分钟倒计时，到时自动交卷
  const TIME_LIMIT = 60 * 60
  const [timed, setTimed] = useState(() => localStorage.getItem('zt_timed_' + pid) === '1')
  const [timeUp, setTimeUp] = useState(false)

  useEffect(() => () => clearTimeout(autoTimer.current), [])

  // 多标签页：本卷在其他标签页交卷后，当前标签停止写回进度并跳转成绩页
  const submittedElsewhere = useRef(false)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'zt_sub_' + pid && e.newValue) {
        submittedElsewhere.current = true
        localStorage.removeItem('zt_exam_' + pid)
        localStorage.removeItem('zt_timed_' + pid)
        toast('本卷已在其他标签页交卷，已为你打开成绩页')
        nav('result/' + pid)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [pid, toast])

  useEffect(() => {
    let mounted = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const load = async () => {
      try {
        const d = await api<PaperResp & { paper: { title?: string; generated_count?: number } }>('/papers/' + pid)
        if (!mounted) return
        if (d.paper.status === 'failed') {
          toast(d.paper.fail_reason || '试卷生成失败')
          nav('home')
          return
        }
        if (d.paper.status !== 'ready') {
          setGenState({ n: d.paper.generated_count, title: d.paper.title })
          timer = setTimeout(load, 5000)
          return
        }
        const saved: SavedProgress | null = JSON.parse(localStorage.getItem('zt_exam_' + pid) || 'null')
        let a: Record<number, string> = {}
        let st = Date.now()
        if (saved && ((saved.answers && Object.keys(saved.answers).length) || saved.elapsed)) {
          a = saved.answers || {}
          st = Date.now() - (saved.elapsed || 0) * 1000
          retakeRef.current = !!saved.retake
          if (Array.isArray(saved.marks)) setMarks(saved.marks)
        }
        setAnswers(a)
        setStart(st)
        const first = d.questions.findIndex((q) => !a[q.id])
        setI(first === -1 ? 0 : first)
        setGenState(null)
        setQs(d.questions)
      } catch (e) {
        toast((e as Error).message)
        nav('home')
      }
    }
    load()
    return () => {
      mounted = false
      clearTimeout(timer)
    }
  }, [pid, toast])

  const [secs, setSecs] = useState(0)
  useEffect(() => {
    const t = setInterval(() => {
      const s = Math.floor((Date.now() - start) / 1000)
      setSecs(s)
      setClock(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(t)
  }, [start])
  const remain = Math.max(0, TIME_LIMIT - secs)
  const fmtRemain = `${Math.floor(remain / 60)}:${String(remain % 60).padStart(2, '0')}`

  const save = useCallback(
    (a: Record<number, string>, m: number[]) => {
      if (submittedElsewhere.current) return
      // elapsed 单调不减：多标签页并写时以最大已用时为准，防止倒带变相延时
      let prevElapsed = 0
      try {
        prevElapsed = (JSON.parse(localStorage.getItem('zt_exam_' + pid) || 'null') as SavedProgress | null)?.elapsed || 0
      } catch {
        /* ignore */
      }
      localStorage.setItem(
        'zt_exam_' + pid,
        JSON.stringify({
          answers: a,
          elapsed: Math.max(prevElapsed, Math.floor((Date.now() - start) / 1000)),
          retake: retakeRef.current,
          marks: m,
        })
      )
    },
    [pid, start]
  )

  const pick = useCallback(
    (k: string) => {
      if (!qs) return
      const q = qs[i]
      setAnswers((prev) => {
        const next = { ...prev }
        if (q.qtype === 'multi') {
          const set = new Set((prev[q.id] || '').split('').filter(Boolean))
          if (set.has(k)) set.delete(k)
          else set.add(k)
          const v = [...set].sort().join('')
          if (v) next[q.id] = v
          else delete next[q.id]
        } else next[q.id] = k
        save(next, marks)
        return next
      })
      if (q.qtype !== 'multi' && autoNext && i < qs.length - 1) {
        clearTimeout(autoTimer.current)
        autoTimer.current = setTimeout(() => setI((cur) => (cur === i ? cur + 1 : cur)), 350)
      }
    },
    [qs, i, marks, save, autoNext]
  )

  const [submitting, setSubmitting] = useState(false)

  const submit = useCallback(async () => {
    if (!qs || submitting) return
    const unanswered = qs.length - Object.keys(answers).length
    const singleMulti = qs.filter((q) => q.qtype === 'multi' && (answers[q.id] || '').length === 1).length
    if (
      unanswered > 0 &&
      !(await confirm(
        `还有 ${unanswered} 题未作答${marks.length ? `、${marks.length} 题标记待查` : ''}，确定交卷？未作答题目计为错误但不进错题本。`,
        '确定交卷',
        '继续答题'
      ))
    )
      return
    if (unanswered === 0 && marks.length > 0 && !(await confirm(`还有 ${marks.length} 题标记为待复查，确定交卷？`, '确定交卷', '回去复查'))) return
    if (
      unanswered === 0 &&
      singleMulti > 0 &&
      !(await confirm(`有 ${singleMulti} 道多选题只选了 1 项（多选题至少 2 项，漏选不得分），确定交卷？`, '确定交卷', '回去检查'))
    )
      return
    setSubmitting(true)
    try {
      await api(`/papers/${pid}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          answers,
          duration_sec: Math.floor((Date.now() - start) / 1000),
          retake: retakeRef.current,
          hesitated: marks,
        }),
      })
      localStorage.setItem('zt_sub_' + pid, String(Date.now()))
      localStorage.removeItem('zt_sub_' + pid)
      localStorage.removeItem('zt_exam_' + pid)
      localStorage.removeItem('zt_timed_' + pid)
      nav('result/' + pid)
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        // 慢网下首次提交已在服务端成功，直接去成绩页
        localStorage.setItem('zt_sub_' + pid, String(Date.now()))
        localStorage.removeItem('zt_sub_' + pid)
        localStorage.removeItem('zt_exam_' + pid)
        localStorage.removeItem('zt_timed_' + pid)
        nav('result/' + pid)
        return
      }
      toast((e as Error).message)
      setSubmitting(false)
    }
  }, [qs, answers, marks, pid, start, confirm, toast, submitting])

  // 限时模考期间周期写回已用时，防止刷新倒带变相延时
  useEffect(() => {
    if (!timed || !qs) return
    const t = setInterval(() => save(answers, marks), 10000)
    return () => clearInterval(t)
  }, [timed, qs, answers, marks, save])

  // 限时模考到时自动交卷（跳过确认）
  useEffect(() => {
    if (!timed || !qs || timeUp || remain > 0 || submitting) return
    setTimeUp(true)
    toast('时间到，已自动交卷')
    setSubmitting(true)
    api(`/papers/${pid}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers, duration_sec: TIME_LIMIT, retake: retakeRef.current, hesitated: marks }),
    })
      .then(() => {
        localStorage.setItem('zt_sub_' + pid, String(Date.now()))
        localStorage.removeItem('zt_sub_' + pid)
        localStorage.removeItem('zt_exam_' + pid)
        localStorage.removeItem('zt_timed_' + pid)
        nav('result/' + pid)
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 409) {
          localStorage.setItem('zt_sub_' + pid, String(Date.now()))
          localStorage.removeItem('zt_sub_' + pid)
          localStorage.removeItem('zt_exam_' + pid)
          localStorage.removeItem('zt_timed_' + pid)
          nav('result/' + pid)
          return
        }
        toast((e as Error).message)
        setSubmitting(false)
        setTimeUp(false)
      })
  }, [timed, qs, timeUp, remain, submitting, answers, pid, toast, TIME_LIMIT])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (!qs) return
      if ((e.target as HTMLElement)?.tagName === 'TEXTAREA') return
      const numMap: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' }
      const k = numMap[e.key] || e.key.toUpperCase()
      if (qs[i].qtype !== 'essay' && ['A', 'B', 'C', 'D'].includes(k)) pick(k)
      else if ((e.key === 'ArrowRight' || e.key === 'Enter') && i < qs.length - 1) setI(i + 1)
      else if (e.key === 'ArrowLeft' && i > 0) setI(i - 1)
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [qs, i, pick])

  if (genState)
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-brand-100 border-t-brand-500" />
        <h1 className="mt-5 text-xl font-bold">
          AI 正在按真题风格出卷
          {genState.n ? <span className="ml-1 text-sm font-semibold text-brand-600">（已生成 {genState.n} 题）</span> : null}
        </h1>
        {genState.title ? <p className="mt-1 truncate text-sm text-ink-2">{genState.title}</p> : null}
        <p className="mt-1 text-xs text-ink-3">约 1-2 分钟 · 后台自动生成，关闭页面也不影响；完成后即可开始答题</p>
        <Button variant="outline" size="sm" className="mt-6" onClick={() => nav('home')}>
          先回工作台
        </Button>
      </div>
    )
  if (!qs) return <PageSkeleton />
  const q = qs[i]
  const answered = Object.keys(answers).length
  const marked = marks.includes(q.id)

  const toggleMark = () => {
    setMarks((prev) => {
      const next = prev.includes(q.id) ? prev.filter((x) => x !== q.id) : [...prev, q.id]
      save(answers, next)
      return next
    })
  }

  const leave = async () => {
    if (Object.keys(answers).length && !(await confirm('离开答题页？作答进度已自动保存，下次可继续。', '离开'))) return
    nav('home')
  }

  const grid = (
    <div className="grid grid-cols-5 gap-2 lg:gap-1.5">
      {qs.map((qq, j) => (
        <button
          key={qq.id}
          onClick={() => setI(j)}
          className={cn(
            'relative h-10 lg:h-9 rounded-lg text-xs font-num',
            answers[qq.id] ? 'bg-brand-500 text-white font-semibold' : 'bg-white border border-black/10 text-ink-3',
            j === i ? 'ring-2 ring-brand-400 ring-offset-1' : marks.includes(qq.id) ? 'ring-2 ring-amber-400' : ''
          )}
        >
          {j + 1}
          {marks.includes(qq.id) ? (
            <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-amber-400" />
          ) : null}
        </button>
      ))}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-page">
      <header className="fixed top-0 inset-x-0 z-40 border-b border-black/5 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
          <button onClick={leave} className="h-9 whitespace-nowrap rounded-lg px-2 text-sm text-ink-2 hover:bg-black/5 sm:px-3">
            ‹ 退出
          </button>
          <p className="whitespace-nowrap text-sm font-medium">
            第 <b className="font-num">{i + 1}</b>/{qs.length} 题
            <span className="hidden font-normal text-ink-3 sm:inline"> · 已答 {answered}</span>
          </p>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => {
                const v = !timed
                setTimed(v)
                localStorage.setItem('zt_timed_' + pid, v ? '1' : '0')
                if (v) save(answers, marks)
                toast(v ? '已开启限时模考：60 分钟倒计时，到时自动交卷' : '已切回不限时模式', v)
              }}
              title={timed ? '点击切回不限时' : '点击开启 60 分钟限时模考'}
              className={cn(
                'font-num inline-flex h-10 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 text-xs font-semibold sm:h-8 sm:px-3',
                timed
                  ? remain <= 300
                    ? 'border-rose-300 bg-rose-50 text-rose-600'
                    : 'border-brand-200 bg-brand-50 text-brand-600'
                  : 'border-black/5 bg-page'
              )}
            >
              <Timer size={12} /> {timed ? `剩 ${fmtRemain}` : clock}
            </button>
            <button
              onClick={(e) => {
                toggleMark()
                ;(e.currentTarget as HTMLButtonElement).blur()
              }}
              className={cn(
                'h-8 whitespace-nowrap rounded-full border px-2.5 text-xs font-medium transition-colors sm:px-3',
                marked ? 'pop border-amber-300 bg-amber-100 text-amber-700' : 'border-amber-300/50 bg-amber-50/50 text-amber-600 hover:bg-amber-50'
              )}
            >
              <Flag size={11} className="inline -mt-0.5" /> {marked ? '已标记' : '标记待查'}
            </button>
          </div>
        </div>
        <div className="h-1 bg-black/5">
          <div className="h-full bg-brand-500 transition-[width] duration-300" style={{ width: `${((i + 1) / qs.length) * 100}%` }} />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 pt-20 pb-28 lg:grid lg:grid-cols-[1fr_240px] lg:gap-5">
        <div>
          <Card className="p-5">
            <p className="whitespace-pre-wrap text-[16px] font-medium leading-7">
              {q.qtype === 'multi' ? (
                <span className="mr-1.5 inline-block rounded bg-violet-100 px-1.5 py-0.5 align-middle text-[11px] font-semibold text-violet-600">
                  多选
                </span>
              ) : null}
              {q.qtype === 'essay' ? (
                <span className="mr-1.5 inline-block rounded bg-sky-100 px-1.5 py-0.5 align-middle text-[11px] font-semibold text-sky-600">
                  材料分析
                </span>
              ) : null}
              {q.stem}
            </p>
            {q.qtype === 'essay' ? (
              <>
                <textarea
                  rows={7}
                  defaultValue={answers[q.id] || ''}
                  placeholder="在此作答（不计入选择题得分，交卷后对照参考要点自评）…"
                  className="mt-4 w-full rounded-xl border border-black/10 px-4 py-3 text-sm leading-relaxed focus:outline-none focus:border-brand-500"
                  onChange={(e) => {
                    const v = e.target.value.trim()
                    setAnswers((prev) => {
                      const next = { ...prev }
                      if (v) next[q.id] = e.target.value.slice(0, 3000)
                      else delete next[q.id]
                      save(next, marks)
                      return next
                    })
                  }}
                />
                <p className="mt-2 text-xs text-ink-3">主观题：作答自动保存，交卷后显示参考答案要点与解析</p>
              </>
            ) : (
              <>
                <div className="mt-4 space-y-2.5">
                  {(['a', 'b', 'c', 'd'] as const).map((o) => {
                    const K = o.toUpperCase()
                    const sel = (answers[q.id] || '').includes(K)
                    return (
                      <button
                        key={o}
                        onClick={() => pick(K)}
                        className={cn(
                          'opt-btn group flex w-full items-start gap-3 rounded-xl border border-black/10 px-4 py-3.5 text-left text-[15px]',
                          sel && 'sel'
                        )}
                      >
                        <span className="opt-badge grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-black/10 text-xs font-semibold text-ink-3">
                          {K}
                        </span>
                        <span className="pt-0.5">{q[('opt_' + o) as keyof Question] as string}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="mt-3 hidden text-xs text-ink-3 sm:block">
                  {q.qtype === 'multi' ? '多选题：点击可多选/取消，选齐后点「下一题」 · ' : ''}键盘 A-D / 1-4 可快速作答，回车/→ 下一题，← 上一题
                </p>
                {q.qtype === 'multi' ? (
                  <p className="mt-3 text-xs text-ink-3 sm:hidden">多选题：点击可多选/取消，选齐后点「下一题」</p>
                ) : null}
              </>
            )}
          </Card>
          <p className="mt-3 text-xs text-ink-3">
            {autoNext ? '单选选中后自动进入下一题（多选需手动下一题）。' : '选中后不会自动跳转，确认无误再点「下一题」。'}拿不准的题可点「标记待查」，蒙对/犹豫的题即使答对也会进错题本复习。作答进度已自动保存。{' '}
            <button
              onClick={() => {
                const v = !autoNext
                setAutoNext(v)
                localStorage.setItem('zt_autonext', v ? '1' : '0')
              }}
              className={cn(
                'ml-1 inline-flex min-h-[40px] items-center rounded-full border px-2.5 py-0.5 align-middle text-xs font-medium sm:min-h-[32px]',
                autoNext ? 'border-brand-300 bg-brand-50 text-brand-600' : 'border-black/10 bg-white text-ink-2'
              )}
            >
              单选自动下一题：{autoNext ? '开' : '关'}
            </button>
          </p>
          {/* 移动端答题卡 */}
          <details
            className="mt-4 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card lg:hidden"
            open={cardOpen}
            onToggle={(e) => setCardOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold">
              答题卡{' '}
              <span className="text-xs font-normal text-ink-3">
                已答 {answered}/{qs.length}
              </span>
            </summary>
            <div className="px-4 pb-4">{grid}</div>
          </details>
        </div>
        {/* 桌面右侧答题卡 */}
        <aside className="hidden lg:block">
          <Card className="sticky top-20 p-4">
            <p className="flex items-center justify-between text-sm font-semibold">
              答题卡{' '}
              <span className="text-xs font-normal text-ink-3">
                已答 {answered}/{qs.length}
              </span>
            </p>
            <div className="mt-3">{grid}</div>
            <div className="mt-3 flex items-center gap-3 border-t border-black/5 pt-3 text-[11px] text-ink-3">
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded bg-brand-500" />
                已答
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded border border-black/10 bg-white" />
                未答
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                待查
              </span>
            </div>
          </Card>
        </aside>
      </div>

      <footer className="fixed bottom-0 inset-x-0 z-40 border-t border-black/5 bg-white" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto flex h-[68px] max-w-5xl items-center gap-3 px-4">
          <Button variant="outline" size="lg" disabled={i === 0} onClick={() => setI(i - 1)}>
            上一题
          </Button>
          {i < qs.length - 1 ? (
            <>
              <button onClick={submit} disabled={submitting} className="ml-auto whitespace-nowrap text-sm text-ink-3 hover:text-brand-600 disabled:opacity-60">
                {submitting ? '交卷中…' : `提前交卷（${answered}/${qs.length}）`}
              </button>
              <Button size="lg" className="px-6 sm:px-10" onClick={() => setI(i + 1)}>
                下一题
              </Button>
            </>
          ) : (
            <Button size="lg" className="flex-1" onClick={submit} disabled={submitting}>
              {submitting ? '交卷中，请稍候…' : `交卷（已答 ${answered}/${qs.length}）`}
            </Button>
          )}
        </div>
      </footer>
    </div>
  )
}
