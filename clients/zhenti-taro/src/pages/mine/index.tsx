import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { api, getUser, logout, requireLogin, streakDays } from '../../api'
import TabBar from '../../components/TabBar'
import './index.scss'

export default function Mine() {
  const [stats, setStats] = useState<any>(null)
  const [streak, setStreak] = useState(0)
  const user = getUser()

  useDidShow(() => {
    if (!requireLogin()) return
    api.stats().then(setStats).catch(() => {})
    api.checkin().then(r => setStreak(streakDays(r.days || []))).catch(() => {})
  })

  const totalN = (stats?.attempts || []).reduce((s: number, a: any) => s + (a.total || 0), 0)
  const totalS = (stats?.attempts || []).reduce((s: number, a: any) => s + (a.score || 0), 0)
  const rate = totalN ? Math.round((totalS / totalN) * 100) : 0

  const doLogout = async () => {
    const r = await Taro.showModal({ title: '退出登录', content: '确定退出当前账号？' })
    if (!r.confirm) return
    logout()
    Taro.redirectTo({ url: '/pages/login/index' })
  }

  const rows = [
    { icon: '📊', label: '学习报告', onClick: () => Taro.navigateTo({ url: '/pages/report/index' }) },
    { icon: '🧾', label: '做题记录', onClick: () => Taro.navigateTo({ url: '/pages/records/index' }) },
    { icon: '🔔', label: '推送设置', onClick: () => Taro.navigateTo({ url: '/pages/push/index' }) },
    { icon: '🚪', label: '退出登录', onClick: doLogout, danger: true }
  ]

  return (
    <View className='page'>
      <View className='card mine-user'>
        <View className='mine-avatar'>{(user?.email || 'U')[0].toUpperCase()}</View>
        <View className='mine-user-texts'>
          <Text className='mine-email'>{user?.email || '未登录'}</Text>
          <Text className={`badge ${user?.plan === 'pro' ? 'badge-warn' : 'badge-brand'}`}>{user?.plan === 'pro' ? 'PRO 会员' : '免费版'}</Text>
        </View>
      </View>

      <View className='card mine-metrics'>
        <View className='mine-metric'>
          <Text className='mine-metric-num num'>{totalN}</Text>
          <Text className='text-xs text-3'>累计做题</Text>
        </View>
        <View className='mine-metric'>
          <Text className='mine-metric-num num'>{rate}%</Text>
          <Text className='text-xs text-3'>平均得分率</Text>
        </View>
        <View className='mine-metric'>
          <Text className='mine-metric-num num' style={{ color: 'var(--streak-600)' }}>{streak}</Text>
          <Text className='text-xs text-3'>连续打卡</Text>
        </View>
      </View>

      {stats && (
        <View className='card mine-kp'>
          <View className='card-title-row'>
            <Text className='card-title'>考点覆盖</Text>
            <Text className='text-xs text-3 num'>{stats.kp_covered || 0}/{stats.kp_total || 0}</Text>
          </View>
          <View className='kp-bar mine-kp-bar'>
            <View className='kp-bar-fill fill-ok' style={{ width: `${Math.round(((stats.kp_covered || 0) / Math.max(1, stats.kp_total || 1)) * 100)}%` }} />
          </View>
        </View>
      )}

      <View className='card mine-list'>
        {rows.map((r, i) => (
          <View key={r.label} className={`mine-row ${i < rows.length - 1 ? 'divided' : ''}`} onClick={r.onClick}>
            <Text className='mine-row-icon'>{r.icon}</Text>
            <Text className={`mine-row-label ${r.danger ? 'rate-rose' : ''}`}>{r.label}</Text>
            <Text className='text-3'>›</Text>
          </View>
        ))}
      </View>

      <Text className='text-xs text-3 mine-ver'>真题工坊 · Taro 客户端 v0.1.0</Text>

      <TabBar current='mine' wrongDue={stats?.wrong_due || 0} />
    </View>
  )
}
