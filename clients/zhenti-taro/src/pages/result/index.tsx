import { useEffect, useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { api, requireLogin, toast, getUser } from '../../api'
import ShareCard, { ShareSpec } from '../../components/ShareCard'
import './index.scss'

type Detail = {
  id: number; seq: number; your: string; answer: string; correct: boolean | null
  analysis: string; knowledge_point: string; qtype: string; stem: string
  opt_a: string; opt_b: string; opt_c: string; opt_d: string
}

export default function Result() {
  const router = useRouter()
  const paperId = parseInt(router.params.paper || '0')
  const [data, setData] = useState<any>(null)
  const [share, setShare] = useState<ShareSpec | null>(null)
  const [kpOpen, setKpOpen] = useState(false)
  const [isFirst, setIsFirst] = useState(false)
  // 得分滚动动效（easeOutCubic，对齐 app2 useCountUp）
  const [shownRate, setShownRate] = useState(0)

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
    <View className='page'>
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
        <Text className='result-title'>{data.title || '真题卷'} · 客观题 {data.total} 道</Text>
        <Text className='text-xs text-3'>
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

      <View className='card'>
        <Text className='card-title'>逐题解析</Text>
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
              <Text className='text-xs text-2 result-q-analysis'>解析：{d.analysis}</Text>
            </View>
          )
        ))}
      </View>
      <ShareCard spec={share} onClose={() => setShare(null)} />
    </View>
  )
}
