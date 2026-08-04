import { useEffect, useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, requireLogin, streakDays, toast } from '../../api'
import './index.scss'

const WEEK_LABEL = ['日', '一', '二', '三', '四', '五', '六']

export default function Report() {
  const [range, setRange] = useState<'week' | 'month'>('week')
  const [stats, setStats] = useState<any>(null)
  const [checkDays, setCheckDays] = useState<string[]>([])
  const [kps, setKps] = useState<{ kp: string; total: number; correct: number }[]>([])

  useEffect(() => {
    if (!requireLogin()) return
    api.stats().then(setStats).catch(e => toast(e.message))
    api.checkin().then(r => setCheckDays(r.days || [])).catch(() => {})
    api.kpstats().then(r => setKps((r.kps || []).slice(0, 3))).catch(() => {})
  }, [])

  const days = range === 'week' ? 7 : 30
  const attempts: any[] = useMemo(() => stats?.attempts || [], [stats])

  const summary = useMemo(() => {
    const since = Date.now() - days * 86400000
    const rows = attempts.filter(a => new Date(a.created_at + 'Z').getTime() >= since)
    const total = rows.reduce((s, a) => s + (a.total || 0), 0)
    const score = rows.reduce((s, a) => s + (a.score || 0), 0)
    const daySet = new Set(rows.map(a => String(a.created_at).slice(0, 10)))
    return { n: total, rate: total ? Math.round((score / total) * 100) : 0, days: daySet.size }
  }, [attempts, days])

  // 近 7 日逐日得分率
  const trend = useMemo(() => {
    const byDay: Record<string, { s: number; t: number }> = {}
    for (const a of attempts) {
      const d = String(a.created_at).slice(0, 10)
      byDay[d] = byDay[d] || { s: 0, t: 0 }
      byDay[d].s += a.score || 0
      byDay[d].t += a.total || 0
    }
    const out: { label: string; rate: number | null; today: boolean }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const key = d.toISOString().slice(0, 10)
      const v = byDay[key]
      out.push({
        label: i === 0 ? '今' : WEEK_LABEL[d.getUTCDay()],
        rate: v && v.t ? Math.round((v.s / v.t) * 100) : null,
        today: i === 0
      })
    }
    return out
  }, [attempts])

  const wk = stats?.week
  const delta = wk && wk.t0 > 0 && wk.t1 > 0
    ? Math.round((wk.s1 / wk.t1) * 100) - Math.round((wk.s0 / wk.t0) * 100)
    : null
  const weakest = kps[0]
  const streak = streakDays(checkDays)

  const goWeak = () => {
    if (!kps.length) return toast('先刷几卷真题，才能按弱项组卷')
    Taro.showLoading({ title: '弱项组卷中…' })
    api.realWeak(kps.map(k => k.kp)).then(r => {
      Taro.hideLoading()
      Taro.navigateTo({ url: `/pages/exam/index?paper=${r.id}` })
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

      <View className='report-hero card'>
        <View className='report-hero-item'>
          <Text className='report-hero-num num'>{summary.n}</Text>
          <Text className='report-hero-label'>{range === 'week' ? '本周' : '本月'}做题</Text>
        </View>
        <View className='report-hero-item'>
          <Text className='report-hero-num num'>{summary.rate}%</Text>
          <Text className='report-hero-label'>平均得分率</Text>
        </View>
        <View className='report-hero-item'>
          <Text className='report-hero-num num'>{summary.days}/{days}</Text>
          <Text className='report-hero-label'>打卡天数</Text>
        </View>
      </View>

      <View className='card'>
        <Text className='card-title'>得分率趋势（近 7 日）</Text>
        <View className='report-chart'>
          {trend.map((d, i) => (
            <View key={i} className='report-bar-col'>
              <Text className={`report-bar-val num ${d.today ? 'today' : ''}`}>{d.rate == null ? '—' : d.rate}</Text>
              <View
                className={`report-bar ${d.today ? 'bar-today' : d.rate == null ? 'bar-empty' : d.rate >= 70 ? 'bar-ok' : 'bar-warn'}`}
                style={{ height: `${Math.max(6, d.rate || 0)}%` }}
              />
              <Text className={`report-bar-label ${d.today ? 'today' : ''}`}>{d.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className='card'>
        <Text className='card-title'>{range === 'week' ? '本周' : '本月'}摘要</Text>
        <View className='report-summary'>
          {delta != null && (
            <Text className='report-summary-item'>
              📈 得分率较上周 <Text className={delta >= 0 ? 'rate-ok' : 'rate-rose'}>{delta >= 0 ? '+' : ''}{delta}%</Text>
            </Text>
          )}
          {weakest && (
            <Text className='report-summary-item'>
              ⚠️ 「{weakest.kp}」正确率 {Math.round((weakest.correct / Math.max(1, weakest.total)) * 100)}%，建议弱项补练
            </Text>
          )}
          <Text className='report-summary-item'>🔥 连续打卡 {streak} 天{streak > 0 ? '，保持节奏' : '，今天交一卷即打卡'}</Text>
          {stats?.wrong_due > 0 && <Text className='report-summary-item'>📕 {stats.wrong_due} 道错题到期待复习</Text>}
        </View>
        <View className='btn-primary report-cta' onClick={goWeak}>按弱项组卷，开始{range === 'week' ? '本周' : '本月'}冲刺</View>
      </View>
    </View>
  )
}
