import { useEffect, useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { api, requireLogin, toast } from '../../api'
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

  useEffect(() => {
    if (!requireLogin() || !paperId) return
    const cached = Taro.getStorageSync(`zt_result_${paperId}`)
    if (cached) { setData(cached); return }
    api.result(paperId).then(setData).catch(e => toast(e.message))
  }, [paperId])

  const rate = data && data.total > 0 ? Math.round((data.score / data.total) * 100) : 0
  const ringColor = rate < 40 ? '#F43F5E' : rate <= 70 ? '#FFA716' : '#00B578'
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
      .slice(0, 5)
  }, [data])

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

  return (
    <View className='page'>
      <View className='card result-hero'>
        <View
          className='result-ring'
          style={{ background: `conic-gradient(${ringColor} 0% ${rate}%, #EEF1F6 ${rate}% 100%)` }}
        >
          <View className='result-ring-center'>
            <Text className='result-score num'>{rate}</Text>
            <Text className='result-score-label'>得分率 %</Text>
          </View>
        </View>
        <Text className='result-title'>{data.title || '真题卷'} · 客观题 {data.total} 道</Text>
        <Text className='text-xs text-3'>
          答对 {data.score}/{data.total} · 用时 {mm}:{String(ss).padStart(2, '0')}
          {data.beat_pct != null ? ` · 击败 ${data.beat_pct}% 研友` : ''}
        </Text>
        <View className='result-actions'>
          <View className='btn-secondary result-btn' onClick={() => Taro.redirectTo({ url: '/pages/home/index' })}>回工作台</View>
          <View
            className='btn-rose result-btn'
            onClick={() => (wrongs.length ? Taro.redirectTo({ url: '/pages/wrong/index' }) : toast('本卷全对，无错题'))}
          >错题重练（{wrongs.length}）</View>
        </View>
      </View>

      <View className='card'>
        <View className='card-title-row'>
          <Text className='card-title'>薄弱考点</Text>
          <Text className='text-xs' style={{ color: 'var(--brand-600)' }} onClick={goWeak}>弱项补练 ›</Text>
        </View>
        <View style={{ marginTop: '12px' }}>
          {kpAgg.map(k => {
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
    </View>
  )
}
