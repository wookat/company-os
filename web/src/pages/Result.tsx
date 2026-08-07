import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { useApp } from '@/lib/store'
import { nav } from '@/lib/router'
import { Button, Card, PageSkeleton, Ring } from '@/components/ui'
import type { PaperResult, ResultDetail } from '@/lib/types'
import { fmtDur } from '@/lib/utils'
import { AiGrade } from '@/pages/Subj'

/** 解析纠错入口：落 question_flags，同一用户同一题只记一条 */
function FlagLink({ qid }: { qid: number }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  if (state === 'done') return <span className="text-xs text-emerald-600">已反馈，感谢帮助我们改进题库</span>
  return (
    <button
      disabled={state === 'sending'}
      onClick={async () => {
        setState('sending')
        try {
          await api(`/questions/${qid}/flag`, { method: 'POST', body: JSON.stringify({ reason: '答案存疑' }) })
          setState('done')
        } catch {
          setState('idle')
        }
      }}
      className="inline-flex min-h-[40px] items-center text-xs text-ink-3 underline decoration-dotted underline-offset-2 hover:text-brand-600 disabled:opacity-60 sm:min-h-[32px]"
    >
      觉得答案或解析有误？反馈 ›
    </button>
  )
}

/** 一句话解析置顶：长解析取首句加粗先看，其余折叠可展开 */
function Analysis({ text }: { text?: string }) {
  const [open, setOpen] = useState(false)
  const t = (text || '').trim()
  const m = t.match(/^.{8,}?[。；!！?？]/)
  const first = m ? m[0] : ''
  const rest = first ? t.slice(first.length).trim() : ''
  if (!first || !rest || t.length <= 90) return <p className="mt-2 leading-6 text-ink-2">{t}</p>
  return (
    <div className="mt-2 text-sm">
      <p className="font-medium leading-6 text-ink">{first}</p>
      {open ? (
        <p className="mt-1 leading-6 text-ink-2">{rest}</p>
      ) : (
        <button onClick={() => setOpen(true)} className="mt-1 inline-flex min-h-[40px] items-center text-xs text-brand-600 hover:underline sm:min-h-[32px]">
          展开完整解析 ▾
        </button>
      )}
    </div>
  )
}

/** 成绩分享图：品牌 canvas 卡（与打卡分享图同风格） */
function makeScoreCard(title: string, score: number, total: number, pct: number, beat: number | undefined, grade: string): string {
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
  x.fillText('真题工坊 · 成绩单', W / 2, 96)
  x.font = '26px sans-serif'
  x.fillStyle = 'rgba(255,255,255,.85)'
  x.fillText(title.slice(0, 18), W / 2, 160)
  // 分数环
  x.strokeStyle = 'rgba(255,255,255,.25)'
  x.lineWidth = 16
  x.beginPath()
  x.arc(W / 2, 340, 120, 0, Math.PI * 2)
  x.stroke()
  x.strokeStyle = '#fff'
  x.lineCap = 'round'
  x.beginPath()
  x.arc(W / 2, 340, 120, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct) / 100)
  x.stroke()
  x.fillStyle = '#fff'
  x.font = 'bold 72px sans-serif'
  x.fillText(`${score}`, W / 2, 348)
  x.font = '26px sans-serif'
  x.fillStyle = 'rgba(255,255,255,.85)'
  x.fillText(`/ ${total} 题 · 正确率 ${pct}%`, W / 2, 396)
  x.font = '28px sans-serif'
  x.fillStyle = '#fff'
  x.fillText(pct >= 40 && typeof beat === 'number' && beat >= 20 ? `击败了 ${beat}% 的研友` : grade.slice(0, 20), W / 2, 528)
  x.fillStyle = 'rgba(255,255,255,.92)'
  x.font = '26px sans-serif'
  x.fillText('历年真题免费在线刷 · 判分 · 错题本 · 分析题背诵', W / 2, 660)
  x.font = 'bold 30px sans-serif'
  x.fillStyle = '#fff'
  x.fillText('zhenti.zalize.com', W / 2, 716)
  return c.toDataURL('image/png')
}

/** 全真模考分析题：作答回显（本地暂存）+ 逐要点自评（沉淀 essay-self）+ AI 逐点批改 */
function MockEssay({ pid, x, mockYear, yourText }: { pid: number; x: ResultDetail; mockYear: number | null; yourText: string }) {
  const points = x.answer.split('\n').filter(Boolean)
  const [sel, setSel] = useState<Set<number>>(() => new Set(x.self || []))
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const togglePt = (pi: number) => {
    setSel((prev) => {
      const n = new Set(prev)
      if (n.has(pi)) n.delete(pi)
      else n.add(pi)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        api(`/papers/${pid}/essay-self`, { method: 'POST', body: JSON.stringify({ question_id: x.id, hits: [...n] }) }).catch(() => undefined)
      }, 300)
      return n
    })
  }
  return (
    <div className="px-4 pb-4 pl-8 text-sm">
      <p className="text-xs font-semibold text-ink-3">你的作答</p>
      <p className="mt-1 whitespace-pre-wrap leading-6 text-ink-2">{yourText || '未作答'}</p>
      <p className="mt-3 text-xs font-semibold text-emerald-600">
        参考答案要点 <span className="font-normal text-ink-3">· 点一下你答到的要点，自评命中</span>
      </p>
      <ul className="mt-1 space-y-1.5 text-sm">
        {points.map((pt, pi) => (
          <li
            key={pi}
            onClick={() => togglePt(pi)}
            className={`-mx-2 cursor-pointer rounded-lg border px-2 py-1.5 leading-6 ${sel.has(pi) ? 'border-ok-100 bg-ok-50 text-ok-700' : 'border-transparent text-ink-2 hover:bg-page'}`}
          >
            <span className="mr-0.5">{sel.has(pi) ? '✓' : '○'}</span> {pt}
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-ink-3">
        自评命中 <b className="font-num">{sel.size}</b>/{points.length} 条
      </p>
      {mockYear && x.seq ? (
        <div className="mt-2 -mx-3">
          <AiGrade year={mockYear} seq={x.seq} points={points} initialText={yourText} />
        </div>
      ) : null}
      <p className="mt-2 text-xs font-semibold text-brand-600">【考查点】{x.knowledge_point}</p>
      <p className="mt-2 leading-6 text-ink-2">{x.analysis}</p>
    </div>
  )
}

/** 得分数字滚动动效 */
function useCountUp(target: number, ms = 900): number {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (target <= 0) return setV(target)
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

export function ResultPage({ pid }: { pid: number }) {
  const { me, toast } = useApp()
  const [d, setD] = useState<PaperResult | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [kpOpen, setKpOpen] = useState(false)
  const [bigFont, setBigFont] = useState(() => localStorage.getItem('zt_result_bigfont') === '1')
  const [isFirst, setIsFirst] = useState(false)
  const shownScore = useCountUp(d?.score ?? 0)
  const shownMockScore = useCountUp(
    d && /全真模考/.test(d.title || '')
      ? d.detail.reduce((s, x) => (x.qtype === 'essay' || !x.correct ? s : s + (x.qtype === 'multi' ? 2 : 1)), 0)
      : 0
  )

  // 首卷完成判定：优先用服务端累计提交数（跨设备准确），无字段时退回账号维度 localStorage
  useEffect(() => {
    if (!d) return
    const k = `zt_done1:${me?.email || ''}`
    if (typeof d.attempt_count === 'number') {
      if (d.attempt_count <= 1 && !localStorage.getItem(k)) setIsFirst(true)
      localStorage.setItem(k, '1')
      return
    }
    if (!localStorage.getItem(k)) {
      setIsFirst(true)
      localStorage.setItem(k, '1')
    }
  }, [d, me])

  useEffect(() => {
    if (!shareUrl) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShareUrl(null)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [shareUrl])

  useEffect(() => {
    api<PaperResult>(`/papers/${pid}/result`)
      .then(setD)
      .catch((e) => {
        toast(e.message)
        nav('home')
      })
  }, [pid, toast])

  if (!d) return <PageSkeleton />

  // 全真模考：满分口径单选 1 分 / 多选 2 分共 50 分；分析题作答从本地暂存回显
  const isMock = /全真模考/.test(d.title || '')
  const mockYear = isMock ? +((d.title || '').match(/^(\d{4}) /)?.[1] || 0) || null : null
  let mockScore = 0
  let mockTotal = 0
  if (isMock)
    for (const x of d.detail) {
      if (x.qtype === 'essay') continue
      const w = x.qtype === 'multi' ? 2 : 1
      mockTotal += w
      if (x.correct) mockScore += w
    }
  let localEssays: Record<number, string> = {}
  try {
    localEssays = JSON.parse(localStorage.getItem('zt_essay_' + pid) || '{}')
  } catch {
    /* ignore */
  }

  const pct = Math.round((d.score / d.total) * 100)
  const kpMap: Record<string, { t: number; c: number }> = {}
  d.detail.forEach((x) => {
    if (x.qtype === 'essay') return
    kpMap[x.knowledge_point] = kpMap[x.knowledge_point] || { t: 0, c: 0 }
    kpMap[x.knowledge_point].t++
    if (x.correct) kpMap[x.knowledge_point].c++
  })
  const weak = Object.entries(kpMap)
    .filter(([, v]) => v.c < v.t)
    .sort((a, b) => a[1].c / a[1].t - b[1].c / b[1].t)
    .map(([k]) => k)
  const grade =
    pct >= 85
      ? '冲刺状态拉满，保持节奏'
      : pct >= 60
        ? `基础稳固，重点攻克 ${weak.length} 个薄弱考点`
        : `打基础期，锁定 ${weak.length} 个薄弱考点逐个拿下`
  const ringColor = pct < 40 ? '#F43F5E' : pct <= 70 ? '#F59E0B' : '#10B981'
  const unanswered = d.detail.filter((x) => x.qtype !== 'essay' && !x.your).length

  const startWeak = async () => {
    try {
      const ks = await api<{ kps?: { kp_name: string }[] }>('/real/kps')
      const norm = (n: string) => (n || '').replace(/和/g, '与').replace(/的辩证关系$/, '')
      const names: string[] = []
      for (const w of weak) {
        const hit = (ks.kps || []).find((k) => norm(k.kp_name) === norm(w))
        if (hit && !names.includes(hit.kp_name)) names.push(hit.kp_name)
        if (names.length >= 3) break
      }
      if (!names.length) return toast('弱项考点暂无对应真题')
      const p = await api<{ id: number }>('/real/weak?kps=' + encodeURIComponent(names.join(',')))
      nav('exam/' + p.id)
    } catch (e) {
      toast((e as Error).message)
    }
  }

  return (
    <div className="pt-4">
      <div className="py-6 text-center">
        {d.title ? <p className="mb-3 text-sm font-medium text-ink-2">{d.title}</p> : null}
        <Ring pct={isMock && mockTotal ? Math.round((mockScore / mockTotal) * 100) : pct} color={ringColor}>
          <span className={`text-3xl font-extrabold font-num ${pct < 40 ? 'text-rose-500' : pct <= 70 ? 'text-amber-500' : 'text-emerald-600'}`}>
            {isMock ? shownMockScore : shownScore}
            <span className="text-base text-ink-3">/{isMock ? mockTotal : d.total}</span>
          </span>
        </Ring>
        {isMock ? (
          <p className="mt-2 text-xs text-ink-3">客观题得分（单选 1 分 / 多选 2 分）· 答对 {d.score}/{d.total} 题 · 分析题见下方自评 / AI 批改</p>
        ) : null}
        <p className="mt-3 text-sm font-semibold text-emerald-600">
          {isFirst ? '第 1 卷完成 🎉 大多数人卡在开始' : '本卷完成 ✓'}
        </p>
        <p className="mt-1 text-sm font-medium">{grade}</p>
        {pct >= 40 && typeof d.beat_pct === 'number' && d.beat_pct >= 20 ? (
          <p className="mt-1.5">
            <span className="inline-block rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600">
              击败了 {d.beat_pct}% 的研友（按全站作答正确率）
            </span>
          </p>
        ) : null}
        <p className="mt-1 text-sm text-ink-2">
          正确率 {pct}%{unanswered ? `（按整卷计，含 ${unanswered} 题未作答）` : ''}
          {d.duration_sec ? ` · 用时 ${fmtDur(d.duration_sec)}` : ''} · 错题已自动加入错题本
        </p>
        <p className="mt-2">
          <button
            onClick={() => setShareUrl(makeScoreCard(d.title || '考研政治真题', d.score, d.total, pct, d.beat_pct, grade))}
            className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600"
          >
            📷 生成成绩分享图 ›
          </button>
        </p>
        {d.history && d.history.length > 1
          ? (() => {
              const delta = d.history![0].score - d.history![1].score
              return (
                <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-1.5 text-xs">
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium font-num ${delta > 0 ? 'bg-ok-50 text-ok-600' : delta < 0 ? 'bg-rose-50 text-rose-500' : 'bg-ink/5 text-ink-3'}`}
                  >
                    较上次{delta > 0 ? ` +${delta} 题 ↑` : delta < 0 ? ` ${delta} 题 ↓` : '持平'}
                  </span>
                  历史成绩：
                  {d.history!
                    .slice()
                    .reverse()
                    .map((h, j) => (
                      <span key={j} className="rounded-full border border-ink/10 bg-card px-2 py-0.5 font-num text-ink-3">
                        {h.score}/{h.total}
                      </span>
                    ))}
                </div>
              )
            })()
          : null}
      </div>

      {/真题/.test(d.title || '') && weak.length ? (
        <div className="mb-4 text-center">
          <Button variant="rose" size="sm" onClick={startWeak}>
            本卷薄弱考点真题再练 ›
          </Button>
          <p className="mt-1.5 text-xs text-ink-3">用本卷错题涉及的考点抽历年真题组一卷，免费不占额度</p>
        </div>
      ) : null}

      <h2 className="font-bold">
        考点覆盖度{' '}
        <button onClick={() => nav('history')} className="ml-1 text-xs font-normal text-brand-500 hover:text-brand-600">
          查看弱项榜 →
        </button>
      </h2>
      <Card className="mt-2 space-y-2 p-4">
        {Object.entries(kpMap)
          .sort((a, b) => a[1].c / a[1].t - b[1].c / b[1].t)
          .slice(0, kpOpen ? undefined : 5)
          .map(([k, v]) => (
            <div key={k} className="flex items-center gap-3 rounded-lg px-1 py-1 text-sm hover:bg-page">
              <span className="flex-1 truncate">{k}</span>
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-ink/5">
                <div
                  className={`h-full ${v.c === v.t ? 'bg-emerald-500' : v.c ? 'bg-amber-400' : 'bg-rose-400'}`}
                  style={{ width: `${Math.max((v.c / v.t) * 100, 4)}%` }}
                />
              </div>
              <span className={`w-8 text-right text-xs font-medium font-num ${v.c === v.t ? 'text-emerald-600' : 'text-rose-500'}`}>
                {v.c}/{v.t}
              </span>
            </div>
          ))}
        {!kpOpen && Object.keys(kpMap).length > 5 ? (
          <button
            onClick={() => setKpOpen(true)}
            className="block w-full rounded-lg py-2 text-center text-xs font-medium text-brand-500 hover:bg-page"
          >
            展开全部 {Object.keys(kpMap).length} 个考点 ▾
          </button>
        ) : null}
      </Card>

      <h2 className="mt-6 flex items-center font-bold">
        逐题解析 <span className="ml-1 text-xs font-normal text-ink-3">答对的题默认折叠</span>
        <button
          onClick={() => {
            const v = !bigFont
            setBigFont(v)
            localStorage.setItem('zt_result_bigfont', v ? '1' : '0')
          }}
          title={bigFont ? '切回标准字号' : '大字阅读模式'}
          className={`ml-auto inline-flex min-h-[32px] items-center rounded-full border px-2.5 text-xs font-semibold ${bigFont ? 'border-brand-300 bg-brand-50 text-brand-600' : 'border-ink/10 bg-card text-ink-2 hover:text-brand-600'}`}
        >
          A{bigFont ? '⁻' : '⁺'} 大字
        </button>
      </h2>
      <div
        className={`mt-2 space-y-3 ${bigFont ? '[&_.text-sm]:!text-[16px] [&_.text-sm]:!leading-7 [&_.text-xs]:!text-[14px] [&_.text-xs]:!leading-6 [&_.leading-6]:!leading-8' : ''}`}
      >
        {d.detail.map((x) =>
          x.qtype === 'essay' ? (
            <details key={x.id} open className="overflow-hidden rounded-2xl border border-ink/5 bg-card shadow-card">
              <summary className="flex cursor-pointer items-start gap-3 p-4 text-sm">
                <span className="mt-0.5 w-1 self-stretch rounded-full bg-sky-400" />
                <span className="flex-1 font-medium whitespace-pre-wrap">
                  {x.seq}.{' '}
                  <span className="mr-1.5 inline-block rounded bg-sky-100 px-1.5 py-0.5 align-middle text-[11px] font-semibold text-sky-600">
                    材料分析
                  </span>
                  {x.stem}
                </span>
                <span className="shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-600">{isMock ? '自评 / AI 批改' : '自评'}</span>
              </summary>
              {isMock ? (
                <MockEssay pid={pid} x={x} mockYear={mockYear} yourText={localEssays[x.id] || x.your || ''} />
              ) : (
                <div className="px-4 pb-4 pl-8 text-sm">
                  <p className="text-xs font-semibold text-ink-3">你的作答</p>
                  <p className="mt-1 whitespace-pre-wrap leading-6 text-ink-2">{x.your || '未作答'}</p>
                  <p className="mt-3 text-xs font-semibold text-emerald-600">参考答案要点</p>
                  <div className="mt-1 space-y-1">
                    {x.answer.split('\n').map((kp, ki) => (
                      <p key={ki} className="leading-6 text-ink-2">
                        · {kp}
                      </p>
                    ))}
                  </div>
                  <p className="mt-2 text-xs font-semibold text-brand-600">【考查点】{x.knowledge_point}</p>
                  <p className="mt-2 leading-6 text-ink-2">{x.analysis}</p>
                  <p className="mt-2"><FlagLink qid={x.id} /></p>
                </div>
              )}
            </details>
          ) : (
            <details key={x.id} open={!x.correct} className="overflow-hidden rounded-2xl border border-ink/5 bg-card shadow-card">
              <summary className="flex cursor-pointer items-start gap-3 p-4 text-sm">
                <span className={`mt-0.5 w-1 self-stretch rounded-full ${x.correct ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span className="flex-1 font-medium">
                  {x.seq}.{' '}
                  {x.qtype === 'multi' ? (
                    <span className="mr-1.5 inline-block rounded bg-violet-100 px-1.5 py-0.5 align-middle text-[11px] font-semibold text-violet-600">
                      多选
                    </span>
                  ) : null}
                  {x.stem}
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${x.correct ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {x.correct ? '答对' : '答错'}
                </span>
              </summary>
              <div className="px-4 pb-4 pl-8 text-sm">
                <div className="flex flex-wrap gap-2">
                  {x.correct ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 font-medium text-emerald-600">
                      ✓ 答对了
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 font-medium text-rose-600">
                      ✗ 你的答案：{x.your || '未作答'}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 font-medium text-emerald-600">
                    ✓ 正确答案：{x.answer}
                  </span>
                </div>
                <p className="mt-2 text-xs font-semibold text-brand-600">【考查点】{x.knowledge_point}</p>
                <Analysis text={x.analysis} />
                <p className="mt-2"><FlagLink qid={x.id} /></p>
              </div>
            </details>
          )
        )}
      </div>

      {shareUrl ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/60 p-4" onClick={() => setShareUrl(null)}>
          <div className="relative w-full max-w-xs rounded-2xl bg-card p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShareUrl(null)}
              aria-label="关闭"
              className="absolute -top-2.5 -right-2.5 grid h-8 w-8 place-items-center rounded-full bg-card text-ink-2 shadow-md"
            >
              ✕
            </button>
            <img src={shareUrl} alt="成绩分享图" className="w-full rounded-xl" />
            <p className="mt-2 text-center text-xs text-ink-3">手机可长按图片保存，发给研友一起刷真题</p>
            <a
              href={shareUrl}
              download={`真题工坊成绩单.png`}
              className="mt-3 block w-full rounded-xl bg-brand-500 py-2.5 text-center text-sm font-semibold text-white"
            >
              保存图片
            </a>
            <button onClick={() => setShareUrl(null)} className="mt-2 w-full rounded-xl bg-ink/5 py-2.5 text-sm text-ink-2">
              关闭
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex items-center gap-3 pb-4">
        <Button variant="outline" size="lg" onClick={() => nav('home')}>
          返回工作台
        </Button>
        <Button size="lg" className="flex-1" onClick={() => nav(d.score < d.total ? 'practice' : 'wrong')}>
          {d.score < d.total ? '立即重练本卷错题' : '去看错题本'}
        </Button>
      </div>
    </div>
  )
}
