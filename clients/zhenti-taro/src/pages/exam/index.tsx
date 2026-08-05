import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { api, requireLogin, toast } from '../../api'
import './index.scss'

type Q = { id: number; seq: number; stem: string; opt_a: string; opt_b: string; opt_c: string; opt_d: string; knowledge_point: string; qtype: string }

export default function Exam() {
  const router = useRouter()
  const paperId = parseInt(router.params.paper || '0')
  const [qs, setQs] = useState<Q[]>([])
  const [cur, setCur] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [marks, setMarks] = useState<Record<number, boolean>>({})
  const [sec, setSec] = useState(0)
  const [gen, setGen] = useState<{ n?: number; title?: string } | null>(null)
  const startRef = useRef(Date.now())
  const draftKey = `zt_exam_draft:${paperId}`

  useEffect(() => {
    if (!requireLogin() || !paperId) return
    let alive = true
    let timer: any
    // AI 生成中轮询：每 5s 拉取试卷状态，就绪后自动进入答题
    const load = () => {
      api.paper(paperId).then((r: any) => {
        if (!alive) return
        if (r.paper.status === 'failed') {
          toast(r.paper.fail_reason || '试卷生成失败')
          setTimeout(() => Taro.redirectTo({ url: '/pages/home/index' }), 1500)
          return
        }
        if (r.paper.status !== 'ready') {
          setGen({ n: r.paper.generated_count, title: r.paper.title })
          timer = setTimeout(load, 5000)
          return
        }
        setGen(null)
        startRef.current = Date.now()
        setQs((r.questions || []).filter((q: Q) => (q.qtype || 'single') !== 'essay'))
        // 本地暂存恢复：中途退出/杀进程后重进本卷可继续作答（对齐 app2 刷新恢复口径）
        try {
          const d = Taro.getStorageSync(draftKey)
          if (d && d.answers && Object.keys(d.answers).length) {
            setAnswers(d.answers)
            setMarks(d.marks || {})
            setCur(d.cur || 0)
            startRef.current = Date.now() - (d.sec || 0) * 1000
            toast(`已恢复上次作答（${Object.values(d.answers).filter(Boolean).length} 题）`)
          }
        } catch { }
      }).catch(e => toast(e.message))
    }
    load()
    const t = setInterval(() => setSec(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    return () => { alive = false; clearTimeout(timer); clearInterval(t) }
  }, [paperId])

  const q = qs[cur]
  const answeredCount = useMemo(() => Object.values(answers).filter(Boolean).length, [answers])

  // 作答变化即本地暂存
  useEffect(() => {
    if (!paperId || !qs.length || answeredCount === 0) return
    try {
      Taro.setStorageSync(draftKey, { answers, marks, cur, sec: Math.floor((Date.now() - startRef.current) / 1000) })
    } catch { }
  }, [answers, marks, cur, qs.length, answeredCount, paperId])

  // 装壳/H5：答题中按返回键先弹确认（native.ts backButton 会读取此 guard）
  useEffect(() => {
    if (process.env.TARO_ENV !== 'h5') return
    if (answeredCount === 0) return
    ;(window as any).__ztLeaveGuard = async () => {
      const r = await Taro.showModal({ title: '退出答题？', content: '作答已本地暂存，重新进入本卷可继续作答。' })
      return r.confirm
    }
    return () => { delete (window as any).__ztLeaveGuard }
  }, [answeredCount])

  const pick = (letter: string) => {
    if (!q) return
    const isMulti = q.qtype === 'multi'
    setAnswers(prev => {
      const curAns = prev[q.id] || ''
      let next: string
      if (isMulti) {
        next = curAns.includes(letter)
          ? curAns.split('').filter(c => c !== letter).join('')
          : [...curAns.split(''), letter].sort().join('')
      } else {
        next = letter
      }
      return { ...prev, [q.id]: next }
    })
    if (q.qtype !== 'multi') {
      setTimeout(() => setCur(c => Math.min(c + 1, qs.length - 1)), 220)
    }
  }

  const doSubmit = async (force = false) => {
    if (!force && answeredCount < qs.length) {
      const r = await Taro.showModal({ title: '确认交卷？', content: `还有 ${qs.length - answeredCount} 题未作答，交卷后未答题记 0 分。` })
      if (!r.confirm) return
    }
    Taro.showLoading({ title: '判分中…' })
    try {
      const ans: Record<string, string> = {}
      for (const [k, v] of Object.entries(answers)) ans[k] = v
      const res = await api.submit(paperId, ans, Math.floor((Date.now() - startRef.current) / 1000))
      Taro.hideLoading()
      Taro.removeStorageSync(draftKey)
      Taro.setStorageSync(`zt_result_${paperId}`, res)
      // 交卷即打卡
      api.checkinPost().catch(() => {})
      Taro.redirectTo({ url: `/pages/result/index?paper=${paperId}` })
    } catch (e: any) {
      Taro.hideLoading()
      if (e.status === 409) {
        Taro.removeStorageSync(draftKey)
        Taro.redirectTo({ url: `/pages/result/index?paper=${paperId}` })
      } else toast(e.message)
    }
  }

  const mm = String(Math.floor(sec / 60)).padStart(2, '0')
  const ss = String(sec % 60).padStart(2, '0')

  if (gen) {
    return (
      <View className='page'>
        <View className='card exam-gen'>
          <Text className='exam-gen-spin'>⏳</Text>
          <Text className='exam-gen-title'>AI 正在按真题风格出卷{gen.n ? `（已生成 ${gen.n} 题）` : ''}</Text>
          {!!gen.title && <Text className='text-xs text-3'>{gen.title}</Text>}
          <Text className='text-xs text-3'>约 1-2 分钟 · 后台自动生成，完成后自动进入答题</Text>
          <View className='btn-secondary exam-gen-btn' onClick={() => Taro.redirectTo({ url: '/pages/home/index' })}>先回工作台</View>
        </View>
      </View>
    )
  }
  if (!q) return <View className='empty'>加载中…</View>

  const curAns = answers[q.id] || ''

  return (
    <View className='exam-page'>
      <View className='exam-top'>
        <Text className='exam-timer num'>⏱ {mm}:{ss}</Text>
        <Text
          className={`exam-mark ${marks[q.id] ? 'on' : ''}`}
          onClick={() => setMarks(p => ({ ...p, [q.id]: !p[q.id] }))}
        >⚐ 标记</Text>
        <View className='exam-progress'><View className='exam-progress-fill' style={{ width: `${((cur + 1) / qs.length) * 100}%` }} /></View>
        <Text className='text-xs text-3 num'>{cur + 1}/{qs.length}</Text>
      </View>

      <View className='exam-scroll'>
        <View className='card'>
          <View className='exam-meta'>
            <Text className={`exam-qtype ${q.qtype === 'multi' ? 'multi' : ''}`}>{q.qtype === 'multi' ? '多选' : '单选'}</Text>
            <Text className='text-xs text-3'>考点：{q.knowledge_point || '—'}</Text>
          </View>
          <Text className='exam-stem'>{q.stem}</Text>
          <View className='exam-opts'>
            {(['A', 'B', 'C', 'D'] as const).map(L => {
              const txt = q[`opt_${L.toLowerCase()}` as 'opt_a']
              const on = curAns.includes(L)
              return (
                <View key={L} className={`exam-opt ${on ? 'on' : ''}`} onClick={() => pick(L)}>
                  <Text className={`exam-opt-letter ${on ? 'on' : ''}`}>{L}.</Text>
                  <Text className='exam-opt-text'>{txt}</Text>
                </View>
              )
            })}
          </View>
          {q.qtype === 'multi' && <Text className='text-xs text-3 exam-multi-tip'>多选题：漏选得部分分，错选不得分</Text>}
        </View>

        {/* 答题卡 */}
        <View className='card'>
          <View className='card-title-row'>
            <Text className='exam-card-title'>答题卡</Text>
            <Text className='text-xs text-3 num'>已答 {answeredCount} · 标记 {Object.values(marks).filter(Boolean).length}</Text>
          </View>
          <View className='exam-grid'>
            {qs.map((x, i) => {
              const done = !!answers[x.id]
              const mk = !!marks[x.id]
              const now = i === cur
              return (
                <View
                  key={x.id}
                  className={`exam-cell num ${now ? 'now' : done ? 'done' : mk ? 'marked' : ''}`}
                  onClick={() => setCur(i)}
                >{i + 1}</View>
              )
            })}
          </View>
        </View>
      </View>

      <View className='exam-footer'>
        <View className='exam-btn-prev' onClick={() => setCur(c => Math.max(0, c - 1))}>上一题</View>
        <Text className='text-xs text-3 num' onClick={() => doSubmit()}>交卷（{answeredCount}/{qs.length}）</Text>
        <View
          className='exam-btn-next'
          onClick={() => (cur === qs.length - 1 ? doSubmit() : setCur(c => Math.min(qs.length - 1, c + 1)))}
        >{cur === qs.length - 1 ? '交卷' : '下一题'}</View>
      </View>
    </View>
  )
}
