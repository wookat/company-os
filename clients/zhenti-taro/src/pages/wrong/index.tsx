import { useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
import { api, requireLogin, toast } from '../../api'
import TabBar from '../../components/TabBar'
import SprintBack from '../../components/SprintBack'
import './index.scss'
import { usePageTheme } from '../../theme'

type WQ = {
  id: number; stem: string; opt_a: string; opt_b: string; opt_c: string; opt_d: string
  answer: string; analysis: string; knowledge_point: string; qtype: string
  your_answer: string; box: number; due: number; due_at: string | null; subject: string
}

// 批量错题重练：一轮到期错题连做 + 完成小结（仍错考点/毕业数/二轮重练），对齐 app2 PracticePage
type Prac = { qs: WQ[]; i: number; right: number; missed: number[]; grad: number; done: boolean }

export default function Wrong() {
  const theme = usePageTheme()
  const [list, setList] = useState<WQ[]>([])
  const [favIds, setFavIds] = useState<Set<number>>(new Set())
  const [tab, setTab] = useState<'due' | 'all' | 'fav'>('due')
  const [open, setOpen] = useState<Record<number, 'retry' | 'analysis' | null>>({})
  const [retryAns, setRetryAns] = useState<Record<number, string>>({})
  const [retryDone, setRetryDone] = useState<Record<number, boolean | null>>({})
  const [loading, setLoading] = useState(true)
  const [prac, setPrac] = useState<Prac | null>(null)
  const [pracAns, setPracAns] = useState('')
  const [pracJudged, setPracJudged] = useState<boolean | null>(null)
  const [pracFb, setPracFb] = useState('')

  const load = () => {
    api.wrongbook().then(r => setList(r.questions || [])).finally(() => setLoading(false))
    api.favorites().then(r => setFavIds(new Set((r.questions || []).map((q: any) => q.id)))).catch(() => {})
  }
  useDidShow(() => { if (requireLogin()) load() })

  const dueList = list.filter(q => q.due)
  const shown = tab === 'due' ? dueList : tab === 'all' ? list : list.filter(q => favIds.has(q.id))

  // 未来 7 天到期分布（记忆曲线可视化）：今日到期 + 后 6 天预告，全 0 时不显示
  const dueDist = useMemo(() => {
    const b = Array(7).fill(0) as number[]
    for (const q of list) {
      if (q.due) b[0]++
      else if (q.due_at) {
        const t = new Date(q.due_at.replace(' ', 'T') + 'Z').getTime()
        const d = Math.ceil((t - Date.now()) / 86400000)
        if (d >= 1 && d <= 6) b[d]++
      }
    }
    return b
  }, [list])
  const distMax = Math.max(...dueDist, 1)

  const toggleFav = async (q: WQ) => {
    try {
      if (favIds.has(q.id)) { await api.favDel(q.id); favIds.delete(q.id) }
      else { await api.favAdd(q.id); favIds.add(q.id) }
      setFavIds(new Set(favIds))
    } catch (e: any) { toast(e.message) }
  }

  const pickRetry = (q: WQ, L: string) => {
    if (retryDone[q.id] != null) return
    const isMulti = q.qtype === 'multi'
    const cur = retryAns[q.id] || ''
    const next = isMulti
      ? (cur.includes(L) ? cur.split('').filter(c => c !== L).join('') : [...cur.split(''), L].sort().join(''))
      : L
    setRetryAns(p => ({ ...p, [q.id]: next }))
    if (!isMulti) judge(q, next)
  }

  const startPrac = (qs: WQ[]) => {
    if (!qs.length) return toast('错题本是空的')
    setPrac({ qs, i: 0, right: 0, missed: [], grad: 0, done: false })
    setPracAns('')
    setPracJudged(null)
    setPracFb('')
  }

  const pracPick = (L: string) => {
    if (!prac || prac.done || pracJudged != null) return
    const q = prac.qs[prac.i]
    const isMulti = q.qtype === 'multi'
    const next = isMulti
      ? (pracAns.includes(L) ? pracAns.split('').filter(c => c !== L).join('') : [...pracAns.split(''), L].sort().join(''))
      : L
    setPracAns(next)
    if (!isMulti) pracJudge(next)
  }

  const pracJudge = async (ans: string) => {
    if (!prac) return
    const q = prac.qs[prac.i]
    const correct = ans === q.answer
    setPracJudged(correct)
    setPrac(p => p ? { ...p, right: p.right + (correct ? 1 : 0), missed: correct ? p.missed : [...p.missed, p.i] } : p)
    try {
      const r: any = await api.wrongReview(q.id, correct)
      if (r.graduated) {
        setPracFb('🎓 连续答对多次，已自动移出错题本')
        setPrac(p => p ? { ...p, grad: p.grad + 1 } : p)
      } else if (correct && r.next_days) setPracFb(`${r.next_days} 天后再复习这道题`)
      else setPracFb('')
    } catch { setPracFb('') }
  }

  const pracNext = () => {
    if (!prac) return
    setPracAns('')
    setPracJudged(null)
    setPracFb('')
    if (prac.i + 1 < prac.qs.length) setPrac({ ...prac, i: prac.i + 1 })
    else setPrac({ ...prac, done: true })
  }

  const exitPrac = () => { setPrac(null); load() }

  const judge = async (q: WQ, ans: string) => {
    const correct = ans === q.answer
    setRetryDone(p => ({ ...p, [q.id]: correct }))
    try {
      const r: any = await api.wrongReview(q.id, correct)
      if (r.graduated) toast('已连对出师，移出错题本', 'success')
      else if (correct) toast(`答对了！${r.next_days} 天后再复习`, 'success')
      else toast('答错了，已重置复习进度')
      setTimeout(load, 1200)
    } catch (e: any) { toast(e.message) }
  }

  // 重练完成小结：仍错考点去重清单 + 毕业提示 + 二轮只练刚错题（对齐 app2）
  if (prac && prac.done) {
    const pct = Math.round((prac.right / prac.qs.length) * 100)
    const missedQs = prac.missed.map(mi => prac.qs[mi]).filter(Boolean)
    const missedKps = [...new Set(missedQs.map(mq => mq.knowledge_point).filter(Boolean))]
    return (
      <View className={`page ${theme}`}>
        <View className='card prac-summary'>
          <Text className='prac-emoji'>{pct >= 80 ? '🎉' : '💪'}</Text>
          <Text className='prac-title'>重练完成：答对 {prac.right} / {prac.qs.length}</Text>
          <Text className='text-sm text-2 prac-sub'>
            {pct >= 80 ? '很稳！继续保持，把剩下的错题也拿下' : '错题还没完全掌握，明天再练一轮'}
            {prac.grad ? ` · 🎓 本轮 ${prac.grad} 题毕业移出错题本` : ''}
          </Text>
          {missedKps.length > 0 && (
            <Text className='text-xs text-3 prac-kps'>
              本轮仍错考点：{missedKps.slice(0, 5).join('、')}{missedKps.length > 5 ? ` 等 ${missedKps.length} 个` : ''}
            </Text>
          )}
          <View className='prac-summary-actions'>
            {missedQs.length > 0 && (
              <View className='btn-primary prac-btn' onClick={() => startPrac(missedQs)}>只重练刚错的 {missedQs.length} 题</View>
            )}
            <View className='btn-secondary prac-btn' onClick={exitPrac}>回错题本</View>
          </View>
        </View>
        <TabBar current='wrong' wrongDue={dueList.length} />
      </View>
    )
  }

  // 重练答题态：逐题作答即时判分
  if (prac) {
    const q = prac.qs[prac.i]
    return (
      <View className={`page ${theme}`}>
        <View className='prac-head'>
          <Text className='prac-head-title'>错题重练</Text>
          <Text className='text-xs text-3 num'>第 {prac.i + 1} / {prac.qs.length} 题 · 答对 {prac.right}</Text>
        </View>
        <View className='prac-progress'><View className='prac-progress-fill' style={{ width: `${((prac.i + (pracJudged != null ? 1 : 0)) / prac.qs.length) * 100}%` }} /></View>
        <View className='card'>
          <View className='wrong-meta'>
            {q.qtype === 'multi' && <Text className='badge badge-warn'>多选</Text>}
            <Text className='text-xs text-3'>{q.subject || '真题'} · 考点:{q.knowledge_point || '—'}</Text>
          </View>
          <Text className='wrong-stem'>{q.stem}</Text>
          <View className='wrong-retry'>
            {(['A', 'B', 'C', 'D'] as const).map(L => {
              const txt = q[`opt_${L.toLowerCase()}` as 'opt_a']
              const on = pracAns.includes(L)
              const showRight = pracJudged != null && q.answer.includes(L)
              const showWrong = pracJudged != null && on && !q.answer.includes(L)
              return (
                <View key={L} className={`wrong-opt ${showRight ? 'right' : showWrong ? 'bad' : on ? 'on' : ''}`} onClick={() => pracPick(L)}>
                  <Text className='wrong-opt-letter'>{L}.</Text>
                  <Text style={{ flex: 1 }}>{txt}</Text>
                  {showRight && <Text className='rate-ok'>✓</Text>}
                  {showWrong && <Text className='rate-rose'>✗</Text>}
                </View>
              )
            })}
          </View>
          {q.qtype === 'multi' && pracJudged == null && (
            <View className='btn-primary wrong-judge' onClick={() => (pracAns ? pracJudge(pracAns) : toast('先选择答案'))}>确认答案</View>
          )}
          {pracJudged != null && (
            <View className='prac-after'>
              <Text className={`text-sm ${pracJudged ? 'rate-ok' : 'rate-rose'}`}>{pracJudged ? '✓ 答对了' : `✗ 答错了，正确答案 ${q.answer}`}</Text>
              {!!pracFb && <Text className='text-xs text-3 prac-fb'>{pracFb}</Text>}
              {!pracJudged && !!q.analysis && <Text className='text-xs text-2 wrong-analysis'>解析：{q.analysis}</Text>}
              <View className='btn-primary prac-next-btn' onClick={pracNext}>{prac.i + 1 < prac.qs.length ? '下一题' : '看本轮小结'}</View>
            </View>
          )}
        </View>
        <View className='text-xs text-3 prac-quit' onClick={exitPrac}>退出重练</View>
        <TabBar current='wrong' wrongDue={dueList.length} />
      </View>
    )
  }

  return (
    <View className={`page ${theme}`}>
      {dueList.length > 0 && (
        <View className='wrong-banner'>
          <Text>⏰ {dueList.length} 题今日到期复习，趁热打铁</Text>
          <View className='wrong-banner-btn' onClick={() => startPrac(dueList)}>错题重练</View>
        </View>
      )}

      {list.length > 0 && dueDist.some(n => n > 0) && (
        <View className='card wrong-dist'>
          <Text className='text-xs text-3 wrong-dist-title'>未来 7 天待复习分布</Text>
          <View className='wrong-dist-bars'>
            {dueDist.map((n, di) => (
              <View key={di} className='wrong-dist-col'>
                <Text className='wrong-dist-n num'>{n || ''}</Text>
                <View className={`wrong-dist-bar ${di === 0 ? 'today' : ''}`} style={{ height: `${Math.max(2, (n / distMax) * 26)}px` }} />
                <Text className='wrong-dist-day'>{di === 0 ? '今日' : `+${di}天`}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View className='wrong-tabs'>
        <View className={`wrong-tab ${tab === 'due' ? 'active' : ''}`} onClick={() => setTab('due')}>今日复习</View>
        <View className={`wrong-tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>全部（{list.length}）</View>
        <View className={`wrong-tab ${tab === 'fav' ? 'active' : ''}`} onClick={() => setTab('fav')}>⭐ 收藏（{favIds.size}）</View>
      </View>

      {loading && <View className='empty'>加载中…</View>}
      {!loading && shown.length === 0 && (
        <View className='empty'>{tab === 'due' ? '今天没有到期错题，去刷一卷真题吧' : '暂无错题，保持！'}</View>
      )}

      {shown.map(q => {
        const mode = open[q.id]
        const done = retryDone[q.id]
        const ans = retryAns[q.id] || ''
        return (
          <View key={q.id} className='card wrong-card'>
            <View className={`wrong-strip ${q.due ? 'rose' : 'warn'}`} />
            <View className='wrong-body'>
              <View className='wrong-meta'>
                <Text className={`badge ${q.due ? 'badge-rose' : 'badge-warn'}`}>{q.due ? '今日复习' : `复习盒 ${q.box}/4`}</Text>
                <Text className='text-xs text-3'>{q.subject || '真题'}{q.qtype === 'multi' ? ' · 多选' : ''}</Text>
                <Text className={`wrong-star ${favIds.has(q.id) ? 'on' : ''}`} onClick={() => toggleFav(q)}>{favIds.has(q.id) ? '★' : '☆'}</Text>
              </View>
              <Text className='wrong-stem'>{q.stem}</Text>
              <Text className='text-xs wrong-ans'>
                <Text className='rate-rose'>你的答案 {q.your_answer}</Text> · <Text className='rate-ok'>正确答案 {q.answer}</Text> · 考点：{q.knowledge_point || '—'}
              </Text>

              {mode === 'retry' && (
                <View className='wrong-retry'>
                  {(['A', 'B', 'C', 'D'] as const).map(L => {
                    const txt = q[`opt_${L.toLowerCase()}` as 'opt_a']
                    const on = ans.includes(L)
                    const showRight = done != null && q.answer.includes(L)
                    const showWrong = done != null && on && !q.answer.includes(L)
                    return (
                      <View
                        key={L}
                        className={`wrong-opt ${showRight ? 'right' : showWrong ? 'bad' : on ? 'on' : ''}`}
                        onClick={() => pickRetry(q, L)}
                      >
                        <Text className='wrong-opt-letter'>{L}.</Text>
                        <Text style={{ flex: 1 }}>{txt}</Text>
                        {showRight && <Text className='rate-ok'>✓</Text>}
                        {showWrong && <Text className='rate-rose'>✗</Text>}
                      </View>
                    )
                  })}
                  {q.qtype === 'multi' && done == null && (
                    <View className='btn-primary wrong-judge' onClick={() => (ans ? judge(q, ans) : toast('先选择答案'))}>确认答案</View>
                  )}
                </View>
              )}

              {mode === 'analysis' && (
                <Text className='text-xs text-2 wrong-analysis'>解析：{q.analysis}</Text>
              )}

              <View className='wrong-actions'>
                <View
                  className='wrong-btn primary'
                  onClick={() => { setOpen(p => ({ ...p, [q.id]: p[q.id] === 'retry' ? null : 'retry' })); setRetryAns(p => ({ ...p, [q.id]: '' })); setRetryDone(p => ({ ...p, [q.id]: null })) }}
                >重练本题</View>
                <View
                  className='wrong-btn'
                  onClick={() => setOpen(p => ({ ...p, [q.id]: p[q.id] === 'analysis' ? null : 'analysis' }))}
                >看解析</View>
              </View>
            </View>
          </View>
        )
      })}

      <SprintBack />
      <TabBar current='wrong' wrongDue={dueList.length} />
    </View>
  )
}
