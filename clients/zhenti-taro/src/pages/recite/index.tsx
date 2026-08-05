import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text } from '@tarojs/components'
import { api, requireLogin, toast } from '../../api'
import BackBar from '../../components/BackBar'
import './index.scss'

type SubjQ = { year: number; seq: number; subject: string; stem: string; questions: string[]; answer_points: string[]; kp_name: string }

const SUBJECTS = ['全部', '马原', '毛中特', '史纲', '思修', '形势与政策']

export default function Recite() {
  const [all, setAll] = useState<SubjQ[]>([])
  const [subject, setSubject] = useState('全部')
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [memoKeys, setMemoKeys] = useState<Set<string>>(new Set())
  const [dueKeys, setDueKeys] = useState<Set<string>>(new Set())
  const [hits, setHits] = useState<Record<string, number[]>>({})
  const timers = useRef<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!requireLogin()) return
    Promise.all([
      api.subjYears().then(async r => {
        const ys = (r.years || []).slice(0, 4).map(x => x.year)
        const packs = await Promise.all(ys.map(y => api.subjective(y).catch(() => null)))
        const qs: SubjQ[] = []
        for (const pk of packs) if (pk) qs.push(...pk.questions.map((q: any) => ({ ...q, year: pk.year })))
        setAll(qs)
      }),
      api.subjMemo().then(r => {
        setMemoKeys(new Set(r.keys || []))
        setDueKeys(new Set(r.due || []))
        const h: Record<string, number[]> = {}
        for (const [k, v] of Object.entries(r.hits || {})) h[k] = (v as any).sel || []
        setHits(h)
      })
    ]).catch(e => toast(e.message)).finally(() => setLoading(false))
  }, [])

  const list = useMemo(
    () => (subject === '全部' ? all : all.filter(q => (q.subject || '').startsWith(subject.slice(0, 2)))),
    [all, subject]
  )
  const q = list[idx % Math.max(1, list.length)]
  const key = q ? `${q.year}-${q.seq}` : ''
  const memorized = memoKeys.has(key)
  const dueList = all.filter(x => dueKeys.has(`${x.year}-${x.seq}`))

  const next = () => { setRevealed(new Set()); setIdx(i => (i + 1) % Math.max(1, list.length)) }

  // 逐条自评命中：展开后再点切换✓，防抖 300ms 同步 /api/subjmemo/hit（与 Web 互通）
  const togglePt = (pi: number) => {
    if (!q) return
    const total = q.answer_points.length
    setHits(prev => {
      const cur = prev[key] || []
      const sel = cur.includes(pi) ? cur.filter(x => x !== pi) : [...cur, pi]
      clearTimeout(timers.current[key])
      timers.current[key] = setTimeout(() => {
        api.subjMemoHit(q.year, q.seq, sel.length, total, sel).catch(() => {})
      }, 300)
      return { ...prev, [key]: sel }
    })
  }

  const markMemorized = async () => {
    if (!q) return
    try {
      await api.subjMemoSet(q.year, q.seq, !memorized)
      const nk = new Set(memoKeys)
      if (memorized) nk.delete(key); else nk.add(key)
      setMemoKeys(nk)
      if (!memorized) {
        toast('已标记背会 ✓', 'success')
        next()
      }
    } catch (e: any) { toast(e.message) }
  }

  const review = async () => {
    if (!dueList.length) return
    const t = dueList[0]
    const i = list.findIndex(x => x.year === t.year && x.seq === t.seq)
    if (i >= 0) { setIdx(i); setRevealed(new Set()) }
    try {
      await api.subjMemoReview(t.year, t.seq)
      const nd = new Set(dueKeys); nd.delete(`${t.year}-${t.seq}`); setDueKeys(nd)
    } catch { }
  }

  return (
    <View className='page'>
      <BackBar title='分析题背诵' />
      <View className='recite-chips'>
        {SUBJECTS.map(s => (
          <View key={s} className={`recite-chip ${subject === s ? 'active' : ''}`} onClick={() => { setSubject(s); setIdx(0); setRevealed(new Set()) }}>{s}</View>
        ))}
        <Text className='text-xs text-3 num recite-count'>已背会 {memoKeys.size}/{all.length || '…'}</Text>
      </View>

      {loading && <View className='empty'>加载分析题库…</View>}
      {!loading && !q && <View className='empty'>该科目暂无分析题</View>}

      {q && (
        <View className='card'>
          <View className='recite-meta'>
            <Text className='recite-tag'>分析题</Text>
            <Text className='text-xs text-3'>{q.year} 年 · 第 {q.seq} 题 · {q.subject}{q.kp_name ? ` · ${q.kp_name}` : ''}</Text>
            {memorized && <Text className='badge badge-ok recite-done'>已背会</Text>}
          </View>
          <Text className='recite-stem'>{q.stem.split(/\n?\(1\)/)[0].trim()}</Text>
          {q.questions.map((setq, i) => (
            <Text key={i} className='recite-setq text-sm text-2'>设问{q.questions.length > 1 ? i + 1 : ''}：{setq}</Text>
          ))}

          <View className='recite-points'>
            <Text className='text-xs text-3 recite-points-tip'>
              参考要点（先想再看，点击展开；展开后再点自评“想到了”）
              {(hits[key] || []).length > 0 && <Text className='rate-ok num'> · 想到 {(hits[key] || []).length}/{q.answer_points.length}</Text>}
            </Text>
            {q.answer_points.map((pt, i) => {
              const on = revealed.has(i)
              const hit = (hits[key] || []).includes(i)
              return (
                <View
                  key={i}
                  className={`recite-point ${on ? 'open' : 'masked'} ${on && hit ? 'hit' : ''}`}
                  onClick={() => {
                    if (!on) { const s = new Set(revealed); s.add(i); setRevealed(s) }
                    else togglePt(i)
                  }}
                >
                  <Text>{on ? `${i + 1}. ${pt}` : `${i + 1}. ${'█'.repeat(Math.min(24, Math.max(8, pt.length)))}`}</Text>
                  {on && <Text className={`text-xs ${hit ? 'rate-ok' : 'text-3'}`}> {hit ? '✓ 想到了' : '点我自评命中'}</Text>}
                </View>
              )
            })}
          </View>

          <View className='recite-actions'>
            <View className={`recite-btn-main ${memorized ? 'off' : ''}`} onClick={markMemorized}>
              {memorized ? '取消背会标记' : '✓ 背会了'}
            </View>
            <View className='recite-btn-next' onClick={next}>下一题</View>
          </View>
        </View>
      )}

      {dueList.length > 0 && (
        <View className='recite-review'>
          <Text>🔁 温习：{dueList.length} 道背会超 7 天的题待温习</Text>
          <View className='recite-review-btn' onClick={review}>去温习</View>
        </View>
      )}
    </View>
  )
}
