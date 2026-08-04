import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { api, requireLogin, nextExam, streakDays, toast } from '../../api'
import TabBar from '../../components/TabBar'
import './index.scss'

export default function Home() {
  const [streak, setStreak] = useState(0)
  const [wrongDue, setWrongDue] = useState(0)
  const [doneToday, setDoneToday] = useState(false)
  const [kps, setKps] = useState<{ kp: string; total: number; correct: number }[]>([])
  const [latestYear, setLatestYear] = useState<number | null>(null)
  const [memoToday, setMemoToday] = useState(0)

  useDidShow(() => {
    if (!requireLogin()) return
    api.stats().then(s => {
      setWrongDue(s.wrong_due || 0)
      const today = new Date().toISOString().slice(0, 10)
      setDoneToday((s.attempts || []).some((a: any) => String(a.created_at).slice(0, 10) === today))
    }).catch(() => {})
    api.checkin().then(r => setStreak(streakDays(r.days || []))).catch(() => {})
    api.kpstats().then(r => setKps((r.kps || []).slice(0, 2))).catch(() => {})
    api.realYears().then(r => {
      const ys = r.years || []
      if (ys.length) {
        const top = ys[0]
        setLatestYear(top.year)
      }
    }).catch(() => {})
    api.subjMemo().then(r => setMemoToday(r.today_n || 0)).catch(() => {})
  })

  const goYear = (year: number | null) => {
    if (!year) return
    Taro.showLoading({ title: '组卷中…' })
    api.realPaper(year).then(r => {
      Taro.hideLoading()
      Taro.navigateTo({ url: `/pages/exam/index?paper=${r.id}` })
    }).catch(e => { Taro.hideLoading(); toast(e.message) })
  }
  const goRand = () => {
    Taro.showLoading({ title: '组卷中…' })
    api.realRandPaper().then(r => {
      Taro.hideLoading()
      Taro.navigateTo({ url: `/pages/exam/index?paper=${r.id}` })
    }).catch(e => { Taro.hideLoading(); toast(e.message) })
  }
  const goWeak = () => {
    if (!kps.length) return toast('先刷几卷真题，弱项榜就有数据了')
    Taro.showLoading({ title: '弱项组卷中…' })
    api.realWeak(kps.map(k => k.kp)).then(r => {
      Taro.hideLoading()
      Taro.navigateTo({ url: `/pages/exam/index?paper=${r.id}` })
    }).catch(e => { Taro.hideLoading(); toast(e.message) })
  }

  const rate = (k: { total: number; correct: number }) => Math.round((k.correct / Math.max(1, k.total)) * 100)
  const cls = (r: number) => (r < 50 ? 'rose' : r < 70 ? 'warn' : 'ok')

  const tasks = [
    { done: wrongDue === 0, label: wrongDue > 0 ? `重练 ${wrongDue} 道到期错题` : '重练到期错题', action: () => Taro.redirectTo({ url: '/pages/wrong/index' }) },
    { done: doneToday, label: '完成 1 卷真题', action: () => Taro.redirectTo({ url: '/pages/years/index' }) },
    { done: memoToday > 0, label: '背 1 道分析题要点', action: () => Taro.navigateTo({ url: '/pages/recite/index' }) }
  ]
  const doneCount = tasks.filter(t => t.done).length

  return (
    <View className='page'>
      {/* 打卡 + 倒计时 */}
      <View className='home-count card'>
        <View>
          <Text className='home-count-label'>距 {nextExam().year} 考研</Text>
          <View className='home-count-num-row'>
            <Text className='home-count-num num'>{nextExam().days}</Text>
            <Text className='home-count-unit'> 天</Text>
          </View>
        </View>
        <View className='home-streak'>🔥 连续 {streak} 天</View>
      </View>

      {/* 2026 新卷横幅 */}
      <View className='home-new card' onClick={() => goYear(latestYear)}>
        <Text className='home-new-badge'>NEW</Text>
        <View className='home-new-body'>
          <Text className='home-new-title'>{latestYear || 2026} 年真题已上架</Text>
          <Text className='text-xs text-3'>客观题整卷模考 · 摸清起点</Text>
        </View>
        <Text className='home-new-cta'>开刷 ›</Text>
      </View>

      {/* 今日任务 */}
      <View className='card'>
        <View className='card-title-row'>
          <Text className='card-title'>今日任务</Text>
          <Text className='text-xs text-3 num'>{doneCount}/3 已完成</Text>
        </View>
        <View className='home-tasks'>
          {tasks.map((t, i) => (
            <View key={i} className='home-task' onClick={t.action}>
              <View className={`home-task-dot ${t.done ? 'done' : ''}`}>{t.done ? '✓' : ''}</View>
              <Text className='text-sm'>{t.label}</Text>
              <Text className={`home-task-cta ${t.done ? 'text-3' : ''}`}>{t.done ? '完成' : '去完成 ›'}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 快捷入口 */}
      <View className='home-grid'>
        <View className='card home-grid-item' onClick={() => Taro.redirectTo({ url: '/pages/years/index' })}>
          <Text className='home-grid-icon'>📄</Text>
          <Text className='home-grid-title'>历年真题</Text>
          <Text className='text-xs text-3'>2010-2026 整卷模考</Text>
        </View>
        <View className='card home-grid-item' onClick={() => Taro.navigateTo({ url: '/pages/recite/index' })}>
          <Text className='home-grid-icon'>🗣️</Text>
          <Text className='home-grid-title'>分析题背诵</Text>
          <Text className='text-xs text-3'>要点遮盖 · 先想再看</Text>
        </View>
        <View className='card home-grid-item' onClick={goRand}>
          <Text className='home-grid-icon'>⚡</Text>
          <Text className='home-grid-title'>乱序快刷 20 题</Text>
          <Text className='text-xs text-3'>全库随机组卷</Text>
        </View>
        <View className='card home-grid-item' onClick={() => Taro.redirectTo({ url: '/pages/wrong/index' })}>
          <Text className='home-grid-icon'>📕</Text>
          <Text className='home-grid-title'>错题本</Text>
          <Text className={`text-xs ${wrongDue > 0 ? 'rate-rose' : 'text-3'}`}>{wrongDue > 0 ? `${wrongDue} 题今日到期` : '暂无到期'}</Text>
        </View>
      </View>

      {/* 弱项榜 */}
      <View className='card'>
        <View className='card-title-row'>
          <Text className='card-title'>弱项榜</Text>
          <Text className='text-xs' style={{ color: 'var(--brand-600)' }} onClick={goWeak}>弱项组卷 ›</Text>
        </View>
        <View style={{ marginTop: '12px' }}>
          {kps.length === 0 && <Text className='text-xs text-3'>刷完一卷真题后，这里会显示你的薄弱考点</Text>}
          {kps.map(k => {
            const r = rate(k)
            const c = cls(r)
            return (
              <View key={k.kp} className='kp-row'>
                <View className='kp-row-head'>
                  <Text>{k.kp}</Text>
                  <Text className={`num rate-${c}`}>{r}%</Text>
                </View>
                <View className='kp-bar'><View className={`kp-bar-fill fill-${c}`} style={{ width: `${r}%` }} /></View>
              </View>
            )
          })}
        </View>
      </View>

      <TabBar current='home' wrongDue={wrongDue} />
    </View>
  )
}
