import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { api, requireLogin, nextExam, streakDays, toast, getUser } from '../../api'
import TabBar from '../../components/TabBar'
import ShareCard, { ShareSpec } from '../../components/ShareCard'
import './index.scss'

type DailyQ = {
  id: number; year: number; seq: number; qtype: string; stem: string
  opt_a: string; opt_b: string; opt_c: string; opt_d: string
  answer: string; analysis?: string; subject?: string; kp_name?: string
}

export default function Home() {
  const [streak, setStreak] = useState(0)
  const [checkDays, setCheckDays] = useState<string[]>([])
  const [wrongDue, setWrongDue] = useState(0)
  const [doneToday, setDoneToday] = useState(false)
  const [attemptsEmpty, setAttemptsEmpty] = useState(false)
  const [kps, setKps] = useState<{ kp: string; total: number; correct: number }[]>([])
  const [latestYear, setLatestYear] = useState<number | null>(null)
  const [memoToday, setMemoToday] = useState(0)
  const [daily, setDaily] = useState<DailyQ | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [onboardHidden, setOnboardHidden] = useState(true)
  const [share, setShare] = useState<ShareSpec | null>(null)

  const uid = getUser()?.id
  const onboardKey = `zt_onboard_done:${uid ?? ''}`

  useDidShow(() => {
    if (!requireLogin()) return
    setOnboardHidden(Taro.getStorageSync(onboardKey) === '1')
    api.stats().then(s => {
      setWrongDue(s.wrong_due || 0)
      const atts = s.attempts || []
      setAttemptsEmpty(atts.length === 0)
      const today = new Date().toISOString().slice(0, 10)
      setDoneToday(atts.some((a: any) => String(a.created_at).slice(0, 10) === today))
    }).catch(() => {})
    api.checkin().then(r => {
      setCheckDays(r.days || [])
      setStreak(streakDays(r.days || []))
    }).catch(() => {})
    api.kpstats().then(r => setKps((r.kps || []).slice(0, 2))).catch(() => {})
    api.realYears().then(r => {
      const ys = r.years || []
      if (ys.length) setLatestYear(ys[0].year)
    }).catch(() => {})
    api.subjMemo().then(r => setMemoToday(r.today_n || 0)).catch(() => {})
    api.realDaily().then(r => setDaily(r.q || null)).catch(() => {})
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
  const goKpDrill = (name: string) => {
    Taro.showLoading({ title: '考点组卷中…' })
    api.realKp(name).then(r => {
      Taro.hideLoading()
      Taro.navigateTo({ url: `/pages/exam/index?paper=${r.id}` })
    }).catch(e => { Taro.hideLoading(); toast(e.message) })
  }

  // 每日一题：先想再揭晓；揭晓即打卡（当天未打卡时）+ 揭晓计数
  const reveal = () => {
    if (revealed || !daily) return
    setRevealed(true)
    api.dailyReveal().catch(() => {})
    const today = new Date().toISOString().slice(0, 10)
    if (!checkDays.includes(today)) {
      api.checkinPost().then(() => {
        const nd = [today, ...checkDays]
        setCheckDays(nd)
        setStreak(streakDays(nd))
        toast('今日打卡成功 ✓', 'success')
      }).catch(() => {})
    }
  }

  const closeOnboard = () => {
    Taro.setStorageSync(onboardKey, '1')
    setOnboardHidden(true)
  }

  const shareStreak = () =>
    setShare({ kind: 'streak', streak, total: checkDays.length, daysLeft: nextExam().days })

  const rate = (k: { total: number; correct: number }) => Math.round((k.correct / Math.max(1, k.total)) * 100)
  const cls = (r: number) => (r < 50 ? 'rose' : r < 70 ? 'warn' : 'ok')

  // 无到期错题时不计入任务（没错题≠已完成）
  const tasks = [
    ...(wrongDue > 0
      ? [{ done: false, label: `重练 ${wrongDue} 道到期错题`, action: () => Taro.redirectTo({ url: '/pages/wrong/index' }) }]
      : []),
    { done: doneToday, label: '完成 1 卷真题', action: () => Taro.redirectTo({ url: '/pages/years/index' }) },
    { done: memoToday > 0, label: '背 1 道分析题要点', action: () => Taro.navigateTo({ url: '/pages/recite/index' }) }
  ]
  const doneCount = tasks.filter(t => t.done).length

  const dailyOpts: [string, string][] = daily
    ? [['A', daily.opt_a], ['B', daily.opt_b], ['C', daily.opt_c], ['D', daily.opt_d]]
    : []

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
        <View className='home-streak' onClick={shareStreak}>🔥 连续 {streak} 天 · 晒打卡</View>
      </View>

      {/* 新用户三步上手（无作答记录时展示，按账号记忆关闭） */}
      {attemptsEmpty && !onboardHidden && (
        <View className='card home-onboard'>
          <View className='card-title-row'>
            <Text className='card-title'>三步上手</Text>
            <View className='home-onboard-close' onClick={closeOnboard}>✕</View>
          </View>
          <View className='home-onboard-step' onClick={() => goYear(latestYear)}>
            <Text className='home-onboard-num'>1</Text>
            <Text className='text-sm'>做一卷 {latestYear || 2026} 年真题，摸清起点</Text>
            <Text className='home-task-cta'>去做题 ›</Text>
          </View>
          <View className='home-onboard-step' onClick={() => Taro.navigateTo({ url: '/pages/report/index' })}>
            <Text className='home-onboard-num'>2</Text>
            <Text className='text-sm'>看考点报告 / 错题本，锁定薄弱点</Text>
            <Text className='home-task-cta'>去看看 ›</Text>
          </View>
          <View className='home-onboard-step' onClick={() => Taro.navigateTo({ url: '/pages/mine/index' })}>
            <Text className='home-onboard-num'>3</Text>
            <Text className='text-sm'>每日一题打卡 + 开启每日提醒</Text>
            <Text className='home-task-cta'>去开启 ›</Text>
          </View>
        </View>
      )}

      {/* 每日一题 */}
      {daily && (
        <View className='card'>
          <View className='card-title-row'>
            <Text className='card-title'>每日一题</Text>
            <Text className='text-xs text-3'>{daily.year} 年第 {daily.seq} 题{daily.qtype === 'multi' ? ' · 多选' : ''}</Text>
          </View>
          <Text className='home-daily-stem'>{daily.stem}</Text>
          <View className='home-daily-opts'>
            {dailyOpts.map(([k, v]) => (
              <Text key={k} className={`home-daily-opt ${revealed && daily.answer.includes(k) ? 'right' : ''}`}>
                {revealed && daily.answer.includes(k) ? '✓ ' : ''}{k}. {v}
              </Text>
            ))}
          </View>
          {!revealed ? (
            <View className='btn-primary home-daily-btn' onClick={reveal}>先想好答案，再点我揭晓</View>
          ) : (
            <View className='home-daily-ana'>
              <Text className='text-xs rate-ok'>答案：{daily.answer}</Text>
              {!!daily.analysis && (daily.analysis || '').split(/(?=[A-D](?:项|正确|错误|对|错))/).map((seg, i) => (
                <Text key={i} className='home-daily-ana-line text-xs text-2'>{seg}</Text>
              ))}
              {!!daily.kp_name && (
                <View className='btn-secondary home-daily-btn' onClick={() => goKpDrill(daily.kp_name!)}>
                  这个考点直练：{daily.kp_name} ›
                </View>
              )}
            </View>
          )}
        </View>
      )}

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
          <Text className='text-xs text-3 num'>{doneCount}/{tasks.length} 已完成</Text>
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
        <View className='card home-grid-item' onClick={() => Taro.navigateTo({ url: '/pages/search/index' })}>
          <Text className='home-grid-icon'>🔍</Text>
          <Text className='home-grid-title'>搜真题</Text>
          <Text className='text-xs text-3'>年份题号直达 · 考点搜索</Text>
        </View>
        <View className='card home-grid-item' onClick={() => Taro.navigateTo({ url: '/pages/kps/index' })}>
          <Text className='home-grid-icon'>🎯</Text>
          <Text className='home-grid-title'>按考点选题</Text>
          <Text className='text-xs text-3'>考点直练 · AI 补练</Text>
        </View>
        <View className='card home-grid-item' onClick={goRand}>
          <Text className='home-grid-icon'>⚡</Text>
          <Text className='home-grid-title'>乱序快刷 20 题</Text>
          <Text className='text-xs text-3'>全库随机组卷</Text>
        </View>
        <View className='card home-grid-item' onClick={() => Taro.navigateTo({ url: '/pages/recite/index' })}>
          <Text className='home-grid-icon'>🗣️</Text>
          <Text className='home-grid-title'>分析题背诵</Text>
          <Text className='text-xs text-3'>要点遮盖 · 逐条自评</Text>
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

      <ShareCard spec={share} onClose={() => setShare(null)} />
      <TabBar current='home' wrongDue={wrongDue} />
    </View>
  )
}
