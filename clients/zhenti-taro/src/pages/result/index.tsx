import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { api, requireLogin, toast, getUser } from '../../api'
import ShareCard, { ShareSpec } from '../../components/ShareCard'
import AiGrade from '../../components/AiGrade'
import './index.scss'
import { usePageTheme } from '../../theme'

/** 解析纠错入口：落 question_flags，同一用户同一题只记一条 */
function FlagLink({ qid }: { qid: number }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  if (state === 'done') return <Text className='text-xs rate-ok result-flag-done'>已反馈，感谢帮助我们改进题库</Text>
  return (
    <Text
      className='text-xs text-3 result-flag'
      onClick={async () => {
        if (state === 'sending') return
        setState('sending')
        try {
          await api.flagQuestion(qid)
          setState('done')
        } catch {
          setState('idle')
        }
      }}
    >觉得答案或解析有误？反馈 ›</Text>
  )
}

/** 一句话解析置顶：长解析取首句加粗先看，其余折叠可展开 */
function Analysis({ text }: { text?: string }) {
  const [open, setOpen] = useState(false)
  const t = (text || '').trim()
  const m = t.match(/^.{8,}?[。；!！?？]/)
  const first = m ? m[0] : ''
  const rest = first ? t.slice(first.length).trim() : ''
  if (!first || !rest || t.length <= 90) return <Text className='text-xs text-2 result-q-analysis'>解析：{t}</Text>
  return (
    <View className='result-q-analysis'>
      <Text className='text-xs result-ana-first'>解析：{first}</Text>
      {open ? (
        <Text className='text-xs text-2 result-ana-rest'>{rest}</Text>
      ) : (
        <Text className='text-xs result-ana-more' onClick={() => setOpen(true)}>展开完整解析 ▾</Text>
      )}
    </View>
  )
}

type Detail = {
  id: number; seq: number; your: string; answer: string; correct: boolean | null
  analysis: string; knowledge_point: string; qtype: string; stem: string
  opt_a: string; opt_b: string; opt_c: string; opt_d: string
  self?: number[]
}

/** 全真模考分析题：作答回显 + 逐要点自评（防抖 300ms 同步 essay-self）+ AI 批改 */
function MockEssay({ pid, x, mockYear, yourText }: { pid: number; x: Detail; mockYear: number; yourText: string }) {
  const points = (x.answer || '').split('\n').filter(Boolean)
  const [sel, setSel] = useState<Set<number>>(() => new Set(x.self || []))
  const timer = useRef<any>(null)
  const togglePt = (pi: number) => {
    setSel(prev => {
      const n = new Set(prev)
      if (n.has(pi)) n.delete(pi)
      else n.add(pi)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        api.essaySelf(pid, x.id, [...n]).catch(() => undefined)
      }, 300)
      return n
    })
  }
  return (
    <View className='result-essay'>
      <View className='result-q-meta'>
        <Text className='badge badge-warn'>分析题 第 {x.seq} 题</Text>
        <Text className='text-xs text-3'>{x.knowledge_point || '—'}</Text>
      </View>
      <Text className='result-q-stem'>{x.stem}</Text>
      <View className='result-essay-your'>
        <Text className='text-xs text-3'>你的作答</Text>
        <Text className='text-sm result-essay-your-text'>{yourText || '（未作答）'}</Text>
      </View>
      <Text className='text-xs text-3 result-essay-tip'>
        参考要点（点击要点自评命中，已命中 {sel.size}/{points.length}）
      </Text>
      {points.map((pt, pi) => (
        <View key={pi} className={`result-essay-pt ${sel.has(pi) ? 'hit' : ''}`} onClick={() => togglePt(pi)}>
          <Text className='text-sm'>{sel.has(pi) ? '✓' : '○'} {pi + 1}. {pt}</Text>
        </View>
      ))}
      {!!x.analysis && <Analysis text={x.analysis} />}
      <AiGrade year={mockYear} seq={x.seq} points={points} initialText={yourText} />
    </View>
  )
}

export default function Result() {
  const theme = usePageTheme()
  const router = useRouter()
  const paperId = parseInt(router.params.paper || '0')
  const [data, setData] = useState<any>(null)
  const [share, setShare] = useState<ShareSpec | null>(null)
  const [kpOpen, setKpOpen] = useState(false)
  const [isFirst, setIsFirst] = useState(false)
  // 得分滚动动效（easeOutCubic，对齐 app2 useCountUp）
  const [shownRate, setShownRate] = useState(0)
  // 成绩页解析区大字模式（zt_result_bigfont 与 Web 互通）
  const [bigFont, setBigFont] = useState(false)
  const toggleBigFont = () => {
    const v = !bigFont
    setBigFont(v)
    try { Taro.setStorageSync('zt_result_bigfont', v ? '1' : '0') } catch { }
  }
  // 分析题本地作答回显（zt_essay_<pid>，交卷页暂存）
  const [essayLocal, setEssayLocal] = useState<Record<number, string>>({})
  useEffect(() => {
    try {
      setBigFont(Taro.getStorageSync('zt_result_bigfont') === '1')
      const raw = Taro.getStorageSync(`zt_essay_${paperId}`)
      if (raw) setEssayLocal(JSON.parse(raw))
    } catch { }
  }, [paperId])

  useEffect(() => {
    if (!requireLogin() || !paperId) return
    const cached = Taro.getStorageSync(`zt_result_${paperId}`)
    if (cached) { setData(cached); return }
    api.result(paperId).then(setData).catch(e => toast(e.message))
  }, [paperId])

  // 首卷完成判定：优先用服务端 attempt_count（跨设备准确），无字段时退回账号维度本地标记
  useEffect(() => {
    if (!data) return
    const k = `zt_done1:${getUser()?.email || ''}`
    const seen = Taro.getStorageSync(k)
    if (typeof data.attempt_count === 'number') {
      if (data.attempt_count <= 1 && !seen) setIsFirst(true)
      Taro.setStorageSync(k, '1')
      return
    }
    if (!seen) {
      setIsFirst(true)
      Taro.setStorageSync(k, '1')
    }
  }, [data])

  const rate = data && data.total > 0 ? Math.round((data.score / data.total) * 100) : 0
  const ringColor = rate < 40 ? '#F43F5E' : rate <= 70 ? '#FFA716' : '#00B578'

  useEffect(() => {
    if (!data) return
    if (rate <= 0) { setShownRate(0); return }
    const ms = 900
    const t0 = Date.now()
    const t = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / ms)
      setShownRate(Math.round(rate * (1 - Math.pow(1 - p, 3))))
      if (p >= 1) clearInterval(t)
    }, 16)
    return () => clearInterval(t)
  }, [data, rate])
  const wrongs: Detail[] = useMemo(() => (data?.detail || []).filter((d: Detail) => d.correct === false), [data])

  // 全真模考：客观题按单选 1 分/多选 2 分计分（50 分制口径）+ 分析题自评/AI 批改
  const isMock = /全真模考/.test(data?.title || '')
  const mockYear = parseInt((data?.title || '').match(/(20\d{2})/)?.[1] || '0')
  const essays: Detail[] = useMemo(
    () => (isMock ? (data?.detail || []).filter((d: Detail) => d.qtype === 'essay') : []),
    [data, isMock]
  )
  const mockObj = useMemo(() => {
    if (!isMock) return null
    let score = 0
    let total = 0
    for (const d of (data?.detail || []) as Detail[]) {
      if (d.correct == null || d.qtype === 'essay') continue
      const w = d.qtype === 'multi' ? 2 : 1
      total += w
      if (d.correct) score += w
    }
    return { score, total }
  }, [data, isMock])

  const kpAgg = useMemo(() => {
    const map: Record<string, { total: number; correct: number }> = {}
    for (const d of (data?.detail || []) as Detail[]) {
      if (d.correct == null) continue
      const kp = d.knowledge_point || '其他'
      map[kp] = map[kp] || { total: 0, correct: 0 }
      map[kp].total++
      if (d.correct) map[kp].correct++
    }
    return Object.entries(map)
      .map(([kp, v]) => ({ kp, ...v, r: Math.round((v.correct / v.total) * 100) }))
      .sort((a, b) => a.r - b.r)
  }, [data])
  const kpShown = kpOpen ? kpAgg : kpAgg.slice(0, 5)

  const goWeak = () => {
    const weak = kpAgg.filter(k => k.r < 70).map(k => k.kp).slice(0, 3)
    if (!weak.length) return toast('本卷没有薄弱考点，继续保持！')
    Taro.showLoading({ title: '弱项组卷中…' })
    api.realWeak(weak).then(r => {
      Taro.hideLoading()
      Taro.redirectTo({ url: `/pages/exam/index?paper=${r.id}` })
    }).catch(e => { Taro.hideLoading(); toast(e.message) })
  }

  if (!data) return <View className='empty'>加载中…</View>

  const mm = Math.floor((data.duration_sec || 0) / 60)
  const ss = (data.duration_sec || 0) % 60

  const weakN = kpAgg.filter(k => k.r < 70).length
  const grade = rate >= 85 ? '冲刺状态拉满，保持节奏' : rate >= 60 ? `基础稳固，重点攻克 ${weakN} 个薄弱考点` : `打基础期，锁定 ${weakN} 个薄弱考点逐个拿下`
  // 正确率 <40% 不显示「击败 X% 研友」，改评语口径
  const showBeat = rate >= 40 && typeof data.beat_pct === 'number' && data.beat_pct >= 20
  const shareScore = () =>
    setShare({ kind: 'score', pct: rate, score: data.score, total: data.total, title: data.title || '真题卷', beat: data.beat_pct, grade })

  return (
    <View className={`page ${theme}`}>
      <View className='card result-hero'>
        <View
          className='result-ring'
          style={{ background: `conic-gradient(${ringColor} 0% ${rate}%, #EEF1F6 ${rate}% 100%)` }}
        >
          <View className='result-ring-center'>
            <Text className='result-score num'>{shownRate}</Text>
            <Text className='result-score-label'>得分率 %</Text>
          </View>
        </View>
        {isFirst && <Text className='result-first'>第 1 卷完成 🎉 大多数人卡在开始</Text>}
        <Text className='result-title'>{data.title || '真题卷'} · 客观题 {data.total} 道{isMock ? ' + 5 道分析题' : ''}</Text>
        <Text className='text-xs text-3'>
          {mockObj ? `客观题得分 ${mockObj.score}/${mockObj.total}（单选 1 分/多选 2 分） · ` : ''}
          答对 {data.score}/{data.total} · 用时 {mm}:{String(ss).padStart(2, '0')}
          {showBeat ? ` · 击败 ${data.beat_pct}% 研友` : ''}
        </Text>
        {!showBeat && <Text className='text-xs text-2 result-grade'>{grade}</Text>}
        <View className='result-actions'>
          <View className='btn-secondary result-btn' onClick={shareScore}>晒成绩</View>
          <View className='btn-secondary result-btn' onClick={() => Taro.redirectTo({ url: '/pages/home/index' })}>回工作台</View>
          <View
            className='btn-rose result-btn'
            onClick={() => (wrongs.length ? Taro.redirectTo({ url: '/pages/wrong/index' }) : toast('本卷全对，无错题'))}
          >错题重练 {wrongs.length}</View>
        </View>
      </View>

      <View className='card'>
        <View className='card-title-row'>
          <Text className='card-title'>薄弱考点</Text>
          <Text className='text-xs' style={{ color: 'var(--brand-600)' }} onClick={goWeak}>弱项补练 ›</Text>
        </View>
        <View style={{ marginTop: '12px' }}>
          {kpShown.map(k => {
            const c = k.r < 50 ? 'rose' : k.r < 70 ? 'warn' : 'ok'
            return (
              <View key={k.kp} className='kp-row'>
                <View className='kp-row-head'>
                  <Text>{k.kp}</Text>
                  <Text className={`num rate-${c}`}>{k.correct}/{k.total}</Text>
                </View>
                <View className='kp-bar'><View className={`kp-bar-fill fill-${c}`} style={{ width: `${k.r}%` }} /></View>
              </View>
            )
          })}
          {!kpOpen && kpAgg.length > 5 && (
            <View className='result-kp-more' onClick={() => setKpOpen(true)}>展开全部 {kpAgg.length} 个考点 ▾</View>
          )}
        </View>
      </View>

      {/* 全真模考：分析题作答回显 + 逐要点自评 + AI 批改 */}
      {essays.length > 0 && (
        <View className={`card ${bigFont ? 'bigfont' : ''}`}>
          <View className='card-title-row'>
            <Text className='card-title'>分析题自评</Text>
            <View className={`bigfont-pill result-bigfont ${bigFont ? 'on' : ''}`} onClick={toggleBigFont}>A{bigFont ? '⁻' : '⁺'} 大字</View>
          </View>
          {essays.map(x => (
            <MockEssay key={x.id} pid={paperId} x={x} mockYear={mockYear} yourText={essayLocal[x.id] || x.your || ''} />
          ))}
        </View>
      )}

      <View className={`card ${bigFont ? 'bigfont' : ''}`}>
        <View className='card-title-row'>
          <Text className='card-title'>逐题解析</Text>
          <View className={`bigfont-pill result-bigfont ${bigFont ? 'on' : ''}`} onClick={toggleBigFont}>A{bigFont ? '⁻' : '⁺'} 大字</View>
        </View>
        {(data.detail || []).map((d: Detail) => (
          d.correct == null ? null : (
            <View key={d.id} className={`result-q ${d.correct ? 'ok' : 'bad'}`}>
              <View className='result-q-meta'>
                <Text className={`badge ${d.correct ? 'badge-ok' : 'badge-rose'}`}>{d.correct ? '✓' : '✗'} 第 {d.seq} 题</Text>
                <Text className='text-xs text-3'>{d.qtype === 'multi' ? '多选' : '单选'} · {d.knowledge_point || '—'}</Text>
              </View>
              <Text className='result-q-stem'>{d.stem}</Text>
              <Text className='text-xs result-q-ans'>
                <Text className='rate-rose'>你的答案 {d.your || '未作答'}</Text> · <Text className='rate-ok'>正确答案 {d.answer}</Text>
              </Text>
              <Analysis text={d.analysis} />
              <FlagLink qid={d.id} />
            </View>
          )
        ))}
      </View>
      <ShareCard spec={share} onClose={() => setShare(null)} />
    </View>
  )
}
