import { useState } from 'react'
import { View, Text, Switch } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { api, fetchMe, MeInfo, logout, requireLogin, streakDays, toast } from '../../api'
import TabBar from '../../components/TabBar'
import './index.scss'

export default function Mine() {
  const [stats, setStats] = useState<any>(null)
  const [streak, setStreak] = useState(0)
  const [me, setMe] = useState<MeInfo | null>(null)
  const [remind, setRemind] = useState(false)
  const [remindBusy, setRemindBusy] = useState(false)

  useDidShow(() => {
    if (!requireLogin()) return
    api.stats().then(setStats).catch(() => {})
    api.checkin().then(r => setStreak(streakDays(r.days || []))).catch(() => {})
    fetchMe().then(setMe)
    api.remindGet().then(r => setRemind(!!r.on)).catch(() => {})
  })

  const totalN = (stats?.attempts || []).reduce((s: number, a: any) => s + (a.total || 0), 0)
  const totalS = (stats?.attempts || []).reduce((s: number, a: any) => s + (a.score || 0), 0)
  const rate = totalN ? Math.round((totalS / totalN) * 100) : 0

  // 每日提醒邮件：与 Web 端 /api/remind 双端互通
  const toggleRemind = async () => {
    if (remindBusy) return
    const next = !remind
    setRemindBusy(true)
    try {
      await api.remindSet(next)
      setRemind(next)
      toast(next ? '已开启每日提醒邮件' : '已关闭每日提醒', next ? 'success' : 'none')
    } catch (e: any) { toast(e.message) } finally { setRemindBusy(false) }
  }

  const inviteLink = me?.invite_code ? `https://zhenti.zalize.com/app2/#reg-${me.invite_code}` : ''
  const copyInvite = () => {
    if (!inviteLink) return
    Taro.setClipboardData({ data: inviteLink }).then(() => toast('邀请链接已复制', 'success'))
  }

  const doLogout = async () => {
    const r = await Taro.showModal({ title: '退出登录', content: '确定退出当前账号？' })
    if (!r.confirm) return
    logout()
    Taro.redirectTo({ url: '/pages/login/index' })
  }

  const rows = [
    { icon: '📊', label: '学习报告', onClick: () => Taro.navigateTo({ url: '/pages/report/index' }) },
    { icon: '🧾', label: '做题记录', onClick: () => Taro.navigateTo({ url: '/pages/records/index' }) },
    { icon: '⭐', label: '真题收藏', onClick: () => Taro.navigateTo({ url: '/pages/favs/index' }) },
    { icon: '🔔', label: '推送设置', onClick: () => Taro.navigateTo({ url: '/pages/push/index' }) },
    { icon: '🚪', label: '退出登录', onClick: doLogout, danger: true }
  ]

  const quota = me?.quota

  return (
    <View className='page'>
      <View className='card mine-user'>
        <View className='mine-avatar'>{(me?.email || 'U')[0].toUpperCase()}</View>
        <View className='mine-user-texts'>
          <Text className='mine-email'>{me?.email || '未登录'}</Text>
          <Text className={`badge ${me?.pro ? 'badge-warn' : 'badge-brand'}`}>
            {me?.pro ? `PRO 会员${me.plan_expires_at ? ` · ${String(me.plan_expires_at).slice(0, 10)} 到期` : ''}` : '免费版'}
          </Text>
        </View>
      </View>

      {/* 会员/额度 */}
      <View className='card mine-quota'>
        <View className='card-title-row'>
          <Text className='card-title'>AI 出卷额度</Text>
          <Text className='text-xs text-3'>{me?.pro ? '会员无限出卷' : '每天 0 点刷新'}</Text>
        </View>
        {me?.pro ? (
          <Text className='text-sm text-2 mine-quota-pro'>会员权益：无限出卷 · 每卷最多 20 题 · 附加分析题</Text>
        ) : (
          <View className='mine-quota-row'>
            <View className='mine-quota-cell'>
              <Text className='mine-metric-num num'>{quota ? quota.paper_left : '—'}</Text>
              <Text className='text-xs text-3'>今日模拟卷</Text>
            </View>
            <View className='mine-quota-cell'>
              <Text className='mine-metric-num num'>{quota ? quota.quick_left : '—'}</Text>
              <Text className='text-xs text-3'>今日快练</Text>
            </View>
            <View className='mine-quota-cell' onClick={() => Taro.navigateTo({ url: '/pages/kps/index' })}>
              <Text className='mine-metric-num'>›</Text>
              <Text className='text-xs' style={{ color: 'var(--brand-600)' }}>去 AI 补练</Text>
            </View>
          </View>
        )}
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

      {/* 每日提醒邮件（与 Web 互通） */}
      <View className='card mine-remind'>
        <View className='mine-remind-texts'>
          <Text className='text-sm mine-remind-title'>每日提醒邮件</Text>
          <Text className='text-xs text-3'>每天一封提醒做题/复盘，与 Web 端同步</Text>
        </View>
        <Switch checked={remind} color='#3D7FFF' onChange={toggleRemind} />
      </View>

      {/* 邀请好友 */}
      {!!inviteLink && (
        <View className='card mine-invite'>
          <View className='card-title-row'>
            <Text className='card-title'>邀请好友</Text>
            <Text className='text-xs text-3 num'>已邀请 {me?.invited_count || 0} 人</Text>
          </View>
          <Text className='text-xs text-3 mine-invite-link'>{inviteLink}</Text>
          <View className='btn-secondary mine-invite-btn' onClick={copyInvite}>复制邀请链接</View>
        </View>
      )}

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

      <Text className='text-xs text-3 mine-ver'>真题工坊 · Taro 客户端 v0.2.0</Text>

      <TabBar current='mine' wrongDue={stats?.wrong_due || 0} />
    </View>
  )
}
