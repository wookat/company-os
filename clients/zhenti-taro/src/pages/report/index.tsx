import { useEffect, useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, requireLogin, streakDays, toast } from '../../api'
import './index.scss'

export default function Report() {
  const [range, setRange] = useState<'week' | 'month'>('week')
  const [stats, setStats] = useState<any>(null)
  const [checkDays, setCheckDays] = useState<string[]>([])
  const [kps, setKps] = useState<{ kp: string; total: number; correct: number }[]>([])
  const [hitWeek, setHitWeek] = useState<{ n: number; t: number } | null>(null)

  useEffect(() => {
    if (!requireLogin()) return
    api.stats().then(setStats).catch(e => toast(e.message))
    api.checkin().then(r => setCheckDays(r.days || [])).catch(() => {})
    api.kpstats().then(r => setKps((r.kps || []).slice(0, 3))).catch(() => {})
    // 分析题自评周命中率（近 7 天有更新的自评记录）
    api.subjMemo().then(r => {
      const wk = Date.now() - 7 * 86400000
      let n = 0, t = 0
      for (const v of Object.values(r.hits || {}) as any[]) {
        if ((v.u || 0) >= wk) { n += v.n || 0; t += v.t || 0 }
      }
      setHitWeek(t > 0 ? { n, t } : null)
    }).catch(() => {})
  }, [])

  const days = range === 'week' ? 7 : 30
  const attempts: any[] = useMemo(() => stats?.attempts || [], [stats])

  const summary = useMemo(() => {
    const since = Date.now() - days * 86400000
    const rows = attempts.filter(a => a.total > 0 && new Date(String(a.created_at).replace(' ', 'T') + 'Z').getTime() >= since)
    const total = rows.reduce((s, a) => s + (a.total || 0), 0)
    const score = rows.reduce((s, a) => s + (a.score || 0), 0)
    const daySet = new Set(rows.map(a => String(a.created_at).slice(0, 10)))
    return { n: total, rate: total ? Math.round((score / total) * 100) : 0, days: daySet.size }
  }, [attempts, days])

  // 正确率趋势：按作答日聚合，时间正序，最多近 12 个有数据的日子
  const trend = useMemo(() => {
    const scored = attempts.filter(a => a.total > 0)
    const asc = scored.slice(0, 60).sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))
    const byDay = new Map<string, { s: number; t: number }>()
    for (const a of asc) {
      const d = String(a.created_at).slice(5, 10).replace('-', '/')
      const v = byDay.get(d) || { s: 0, t: 0 }
      v.s += a.score || 0
      v.t += a.total || 0
      byDay.set(d, v)
    }
    return [...byDay.entries()]
      .map(([d, v]) => ({ day: d, pct: Math.round((v.s / v.t) * 100) }))
      .slice(-12)
  }, [attempts])

  // Y 轴自适应：按数据 min/max 缩放柱高
  const yMin = trend.length ? Math.min(...trend.map(x => x.pct)) : 0
  const yMax = trend.length ? Math.max(...trend.map(x => x.pct)) : 100
  const barH = (pct: number) => (yMax === yMin ? 60 : 15 + Math.round(((pct - yMin) / (yMax - yMin)) * 80))

  const wk = stats?.week
  const delta = wk && wk.t0 > 0 && wk.t1 > 0
    ? Math.round((wk.s1 / wk.t1) * 100) - Math.round((wk.s0 / wk.t0) * 100)
    : null
  const weakest = kps[0]
  const streak = streakDays(checkDays)
  const wrongDue = stats?.wrong_due || 0

  const goWeak = () => {
    if (!kps.length) return toast('先刷几卷真题，才能按弱项组卷')
    Taro.showLoading({ title: '弱项组卷中…' })
    api.realWeak(kps.map(k => k.kp)).then(r => {
      Taro.hideLoading()
      Taro.navigateTo({ url: `/pages/exam/index?paper=${r.id}` })
    }).catch(e => { Taro.hideLoading(); toast(e.message) })
  }

  const aiDrill = (name: string) => {
    Taro.showLoading({ title: '定位考点…' })
    api.kpdrill(name).then(r => {
      Taro.hideLoading()
      Taro.setStorageSync('zt_preset_kp', String(r.kp_id))
      Taro.navigateTo({ url: `/pages/drill/index?material=${r.material_id}` })
    }).catch(e => { Taro.hideLoading(); toast(e.message) })
  }

  return (
    <View className='page'>
      <View className='report-seg-row'>
        <View className='report-seg'>
          <View className={`report-seg-item ${range === 'week' ? 'active' : ''}`} onClick={() => setRange('week')}>本周</View>
          <View className={`report-seg-item ${range === 'month' ? 'active' : ''}`} onClick={() => setRange('month')}>本月</View>
        </View>
      </View>

      {/* 冲刺看板摘要三格：做题道数 / 作答天数 / 待复习错题 */}
      <View className='report-hero card'>
        <View className='report-hero-item'>
          <Text className='report-hero-num num'>{summary.n}</Text>
          <Text className='report-hero-label'>{range === 'week' ? '本周' : '本月'}做题（道）</Text>
        </View>
        <View className='report-hero-item'>
          <Text className='report-hero-num num'>{summary.days}/{days}</Text>
          <Text className='report-hero-label'>有作答天数</Text>
        </View>
        <View className='report-hero-item' onClick={() => Taro.redirectTo({ url: '/pages/wrong/index' })}>
          <Text className={`report-hero-num num ${wrongDue > 0 ? 'rose' : ''}`}>{wrongDue}</Text>
          <Text className='report-hero-label'>待复习错题</Text>
        </View>
      </View>

      <View className='card'>
        <View className='card-title-row'>
          <Text className='card-title'>正确率趋势</Text>
          <Text className='text-xs text-3 num'>{trend.length ? `${yMin}–${yMax}%` : ''}</Text>
        </View>
        {trend.length === 0 && <Text className='text-xs text-3'>还没有作答数据，先做一卷真题</Text>}
        <View className='report-chart'>
          {trend.map((d, i) => (
            <View key={i} className='report-bar-col'>
              <Text className={`report-bar-val num ${i === trend.length - 1 ? 'today' : ''}`}>{d.pct}</Text>
              <View
                className={`report-bar ${i === trend.length - 1 ? 'bar-today' : d.pct >= 70 ? 'bar-ok' : 'bar-warn'}`}
                style={{ height: `${barH(d.pct)}%` }}
              />
              <Text className={`report-bar-label ${i === trend.length - 1 ? 'today' : ''}`}>{d.day}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className='card'>
        <Text className='card-title'>{range === 'week' ? '本周' : '本月'}摘要</Text>
        <View className='report-summary'>
          <Text className='report-summary-item num'>📊 平均得分率 {summary.rate}%</Text>
          {delta != null && (
            <Text className='report-summary-item'>
              📈 得分率较上周 <Text className={delta >= 0 ? 'rate-ok' : 'rate-rose'}>{delta >= 0 ? '+' : ''}{delta}%</Text>
            </Text>
          )}
          {hitWeek && (
            <Text className='report-summary-item'>
              🗣️ 分析题自评：本周要点命中率 <Text className={hitWeek.n / hitWeek.t >= 0.6 ? 'rate-ok' : 'rate-warn'}>{Math.round((hitWeek.n / hitWeek.t) * 100)}%</Text>（{hitWeek.n}/{hitWeek.t} 条）
            </Text>
          )}
          {weakest && (
            <Text className='report-summary-item'>
              ⚠️ 「{weakest.kp}」正确率 {Math.round((weakest.correct / Math.max(1, weakest.total)) * 100)}%，建议弱项补练
            </Text>
          )}
          <Text className='report-summary-item'>🔥 连续打卡 {streak} 天{streak > 0 ? '，保持节奏' : '，今天交一卷即打卡'}</Text>
          {wrongDue > 0 && <Text className='report-summary-item'>📕 {wrongDue} 道错题到期待复习</Text>}
        </View>
        <View className='btn-primary report-cta' onClick={goWeak}>按弱项组卷，开始{range === 'week' ? '本周' : '本月'}冲刺</View>
      </View>

      {/* 薄弱考点 → 真题直练 / AI 补练 */}
      {kps.length > 0 && (
        <View className='card'>
          <Text className='card-title'>薄弱考点补练</Text>
          {kps.map(k => (
            <View key={k.kp} className='report-weak-row'>
              <View className='report-weak-texts'>
                <Text className='text-sm'>{k.kp}</Text>
                <Text className='text-xs text-3 num'>正确率 {Math.round((k.correct / Math.max(1, k.total)) * 100)}% · {k.correct}/{k.total}</Text>
              </View>
              <View className='report-weak-btn' onClick={() => aiDrill(k.kp)}>AI 补练 ›</View>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
