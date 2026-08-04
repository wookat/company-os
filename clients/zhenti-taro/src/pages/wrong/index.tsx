import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
import { api, requireLogin, toast } from '../../api'
import TabBar from '../../components/TabBar'
import './index.scss'

type WQ = {
  id: number; stem: string; opt_a: string; opt_b: string; opt_c: string; opt_d: string
  answer: string; analysis: string; knowledge_point: string; qtype: string
  your_answer: string; box: number; due: number; subject: string
}

export default function Wrong() {
  const [list, setList] = useState<WQ[]>([])
  const [favIds, setFavIds] = useState<Set<number>>(new Set())
  const [tab, setTab] = useState<'due' | 'all' | 'fav'>('due')
  const [open, setOpen] = useState<Record<number, 'retry' | 'analysis' | null>>({})
  const [retryAns, setRetryAns] = useState<Record<number, string>>({})
  const [retryDone, setRetryDone] = useState<Record<number, boolean | null>>({})
  const [loading, setLoading] = useState(true)

  const load = () => {
    api.wrongbook().then(r => setList(r.questions || [])).finally(() => setLoading(false))
    api.favorites().then(r => setFavIds(new Set((r.questions || []).map((q: any) => q.id)))).catch(() => {})
  }
  useDidShow(() => { if (requireLogin()) load() })

  const dueList = list.filter(q => q.due)
  const shown = tab === 'due' ? dueList : tab === 'all' ? list : list.filter(q => favIds.has(q.id))

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

  return (
    <View className='page'>
      {dueList.length > 0 && (
        <View className='wrong-banner'>
          <Text>⏰ {dueList.length} 题今日到期复习，趁热打铁</Text>
          <View className='wrong-banner-btn' onClick={() => setTab('due')}>错题重练</View>
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

      <TabBar current='wrong' wrongDue={dueList.length} />
    </View>
  )
}
