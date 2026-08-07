import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Textarea } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { api, requireLogin, toast } from '../../api'
import './index.scss'
import { usePageTheme } from '../../theme'

type Q = { id: number; seq: number; stem: string; opt_a: string; opt_b: string; opt_c: string; opt_d: string; knowledge_point: string; qtype: string }

export default function Exam() {
  const theme = usePageTheme()
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
  const timedKey = `zt_timed_${paperId}`
  const essayKey = `zt_essay_${paperId}`
  // 限时模考：普通限时 60 分钟；全真模考固定 180 分钟，到时自动交卷
  const [isMock, setIsMock] = useState(false)
  const TIME_LIMIT = (isMock ? 180 : 60) * 60
  const [timed, setTimed] = useState(false)
  const timeUpRef = useRef(false)
  // 单选自动下一题开关（全局持久）
  const [autoNext, setAutoNext] = useState(false)
  const autoTimer = useRef<any>(null)

  useEffect(() => {
    if (!requireLogin() || !paperId) return
    try {
      setTimed(Taro.getStorageSync(timedKey) === '1')
      setAutoNext(Taro.getStorageSync('zt_autonext') === '1')
    } catch { }
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
        // 全真模考：保留 5 道分析题（textarea 作答），强制 180 分钟倒计时
        const mock = /全真模考/.test(r.paper.title || '')
        setIsMock(mock)
        if (mock) {
          setTimed(true)
          try { Taro.setStorageSync(timedKey, '1') } catch { }
        }
        setQs(mock ? (r.questions || []) : (r.questions || []).filter((q: Q) => (q.qtype || 'single') !== 'essay'))
        // 本地暂存恢复：中途退出/杀进程后重进本卷可继续作答（对齐 app2 刷新恢复口径）
        try {
          const d = Taro.getStorageSync(draftKey)
          if (d && ((d.answers && Object.keys(d.answers).length) || d.sec)) {
            setAnswers(d.answers || {})
            setMarks(d.marks || {})
            setCur(d.cur || 0)
            startRef.current = Date.now() - (d.sec || 0) * 1000
            const n = Object.values(d.answers || {}).filter(Boolean).length
            if (n) toast(`已恢复上次作答（${n} 题）`)
          }
        } catch { }
      }).catch(e => toast(e.message))
    }
    load()
    const t = setInterval(() => setSec(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    return () => { alive = false; clearTimeout(timer); clearInterval(t) }
  }, [paperId])

  const q = qs[cur]
  const answeredCount = useMemo(() => Object.values(answers).filter(v => (v || '').trim()).length, [answers])

  // 分析题作答本地暂存（zt_essay_<pid>，成绩页回显用）
  const persistEssays = (a: Record<number, string>) => {
    if (!isMock || !qs.length) return
    try {
      const essays: Record<number, string> = {}
      for (const x of qs) if (x.qtype === 'essay' && (a[x.id] || '').trim()) essays[x.id] = a[x.id]
      Taro.setStorageSync(essayKey, JSON.stringify(essays))
    } catch { }
  }

  // 已用时单调不减：以本地已存最大值为准，防刷新/重进倒带变相延时
  const persistDraft = () => {
    if (!paperId || !qs.length) return
    try {
      const prev = Taro.getStorageSync(draftKey)
      const prevSec = (prev && prev.sec) || 0
      const nowSec = Math.max(prevSec, Math.floor((Date.now() - startRef.current) / 1000))
      Taro.setStorageSync(draftKey, { answers, marks, cur, sec: nowSec })
    } catch { }
  }

  // 作答变化即本地暂存
  useEffect(() => {
    if (answeredCount === 0) return
    persistDraft()
    persistEssays(answers)
  }, [answers, marks, cur, qs.length, answeredCount, paperId])

  // 限时模考期间每 10s 周期持久化已用时
  useEffect(() => {
    if (!timed || !qs.length) return
    const t = setInterval(persistDraft, 10000)
    return () => clearInterval(t)
  }, [timed, qs.length, answers, marks, cur])

  // 限时模考到时自动交卷（跳过确认，仅触发一次）
  const remain = timed ? Math.max(0, TIME_LIMIT - sec) : 0
  useEffect(() => {
    if (!timed || !qs.length || remain > 0 || timeUpRef.current) return
    timeUpRef.current = true
    toast('时间到，已自动交卷')
    doSubmit(true)
  }, [timed, qs.length, remain])

  const toggleTimed = () => {
    if (isMock) {
      toast('全真模考固定 180 分钟倒计时，到时自动交卷')
      return
    }
    const v = !timed
    setTimed(v)
    try { Taro.setStorageSync(timedKey, v ? '1' : '0') } catch { }
    if (v) persistDraft()
    toast(v ? '已开启限时模考：60 分钟倒计时，到时自动交卷' : '已切回不限时模式')
  }

  const toggleAutoNext = () => {
    const v = !autoNext
    setAutoNext(v)
    try { Taro.setStorageSync('zt_autonext', v ? '1' : '0') } catch { }
    toast(v ? '已开启：单选选中 0.35s 后自动下一题' : '已关闭自动下一题')
  }

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
    if (!q || q.qtype === 'essay') return
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
    if (q.qtype !== 'multi' && autoNext && cur < qs.length - 1) {
      clearTimeout(autoTimer.current)
      autoTimer.current = setTimeout(() => setCur(c => (c === cur ? c + 1 : c)), 350)
    }
  }

  useEffect(() => () => clearTimeout(autoTimer.current), [])

  const doSubmit = async (force = false) => {
    const hes = qs.filter(x => marks[x.id]).map(x => x.id)
    // 未作答清单确认：列出具体题号（最多 10 个），取消=去补答跳到第一道未作答题（对齐 app2）
    const unansweredIdx = qs.map((x, qi) => ((answers[x.id] || '').trim() ? -1 : qi)).filter(v => v >= 0)
    if (!force && unansweredIdx.length > 0) {
      const nums = unansweredIdx.slice(0, 10).map(v => `第${v + 1}题`).join('、')
      // 「去补答」为主按钮（confirm 位），降低误交卷
      const r = await Taro.showModal({
        title: '确认交卷？',
        content: `还有 ${unansweredIdx.length} 题未作答（${nums}${unansweredIdx.length > 10 ? ' 等' : ''}）${hes.length ? `、${hes.length} 题标记待查` : ''}。未作答题目计为错误但不进错题本。`,
        confirmText: '去补答',
        cancelText: '仍要交卷'
      })
      if (r.confirm) {
        setCur(unansweredIdx[0])
        return
      }
    }
    // 全部作答后仍保留待查/多选单选两道确认链（对齐 app2）
    if (!force && unansweredIdx.length === 0 && hes.length > 0) {
      const r = await Taro.showModal({
        title: '确认交卷？',
        content: `还有 ${hes.length} 题标记为待复查，确定交卷？`,
        confirmText: '确定交卷',
        cancelText: '回去复查'
      })
      if (!r.confirm) return
    }
    const singleMulti = qs.filter(x => x.qtype === 'multi' && (answers[x.id] || '').length === 1).length
    if (!force && unansweredIdx.length === 0 && singleMulti > 0) {
      const r = await Taro.showModal({
        title: '确认交卷？',
        content: `有 ${singleMulti} 道多选题只选了 1 项（多选题至少 2 项，漏选不得分），确定交卷？`,
        confirmText: '确定交卷',
        cancelText: '回去检查'
      })
      if (!r.confirm) return
    }
    Taro.showLoading({ title: '判分中…' })
    try {
      persistEssays(answers)
      const ans: Record<string, string> = {}
      for (const [k, v] of Object.entries(answers)) ans[k] = v
      const res = await api.submit(paperId, ans, timed && timeUpRef.current ? TIME_LIMIT : Math.floor((Date.now() - startRef.current) / 1000), false, hes)
      Taro.hideLoading()
      Taro.removeStorageSync(draftKey)
      Taro.removeStorageSync(timedKey)
      Taro.setStorageSync(`zt_result_${paperId}`, res)
      // 交卷即打卡
      api.checkinPost().catch(() => {})
      Taro.redirectTo({ url: `/pages/result/index?paper=${paperId}` })
    } catch (e: any) {
      Taro.hideLoading()
      if (e.status === 409) {
        Taro.removeStorageSync(draftKey)
        Taro.removeStorageSync(timedKey)
        Taro.redirectTo({ url: `/pages/result/index?paper=${paperId}` })
      } else {
        timeUpRef.current = false
        toast(e.message)
      }
    }
  }

  const clockSec = timed ? remain : sec
  const mm = String(Math.floor(clockSec / 60)).padStart(2, '0')
  const ss = String(clockSec % 60).padStart(2, '0')

  if (gen) {
    return (
      <View className={`page ${theme}`}>
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
    <View className={`exam-page ${theme}`}>
      <View className='exam-top'>
        <Text
          className={`exam-timer num ${timed ? (remain <= 300 ? 'timed-warn' : 'timed-on') : ''}`}
          onClick={toggleTimed}
        >⏱ {timed ? `剩 ${mm}:${ss}` : `${mm}:${ss}`}</Text>
        <Text
          className={`exam-mark ${marks[q.id] ? 'on' : ''}`}
          onClick={() => setMarks(p => ({ ...p, [q.id]: !p[q.id] }))}
        >⚐ {marks[q.id] ? '已标记' : '标记待查'}</Text>
        <View className='exam-progress'><View className='exam-progress-fill' style={{ width: `${((cur + 1) / qs.length) * 100}%` }} /></View>
        <Text className='text-xs text-3 num'>{cur + 1}/{qs.length}</Text>
      </View>

      <View className='exam-scroll'>
        <View className='card'>
          <View className='exam-meta'>
            <Text className={`exam-qtype ${q.qtype === 'multi' ? 'multi' : q.qtype === 'essay' ? 'essay' : ''}`}>{q.qtype === 'multi' ? '多选' : q.qtype === 'essay' ? '分析题' : '单选'}</Text>
            <Text className='text-xs text-3'>考点：{q.knowledge_point || '—'}</Text>
          </View>
          <Text className='exam-stem'>{q.stem}</Text>
          {q.qtype === 'essay' ? (
            <View className='exam-essay'>
              <Textarea
                className='exam-essay-input'
                value={curAns}
                maxlength={3000}
                placeholder='像考场一样把答案写出来（自动保存防丢，交卷后可对照参考要点自评或交给 AI 批改）…'
                onInput={e => {
                  const v = e.detail.value.slice(0, 3000)
                  setAnswers(prev => {
                    const next = { ...prev }
                    if (v.trim()) next[q.id] = v
                    else delete next[q.id]
                    return next
                  })
                }}
              />
              <Text className='text-xs text-3 num'>已写 {curAns.length}/3000 字 · 不计入客观题得分，交卷后在成绩页逐要点自评/AI 批改</Text>
            </View>
          ) : (
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
          )}
          {q.qtype === 'multi' && <Text className='text-xs text-3 exam-multi-tip'>多选题：漏选得部分分，错选不得分</Text>}
          {q.qtype !== 'essay' && <Text className='text-xs text-3 exam-multi-tip'>拿不准的题可点「标记待查」，蒙对/犹豫的题即使答对也会进错题本复习</Text>}
        </View>

        {/* 答题偏好：单选自动下一题 */}
        <View className='card exam-pref'>
          <Text className='text-xs text-2'>{autoNext ? '单选选中后自动进入下一题（多选需手动下一题）' : '选中后不会自动跳转，确认无误再点「下一题」'}</Text>
          <Text className={`exam-pref-btn ${autoNext ? 'on' : ''}`} onClick={toggleAutoNext}>自动下一题 {autoNext ? '已开' : '已关'}</Text>
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
