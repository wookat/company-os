import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Switch } from '@nutui/nutui-react-taro'
import BackBar from '../../components/BackBar'
import './index.scss'
import { usePageTheme } from '../../theme'

const KEY = 'zt_push_prefs'

type Prefs = {
  daily: boolean
  wrongDue: boolean
  reciteReview: boolean
  streakRescue: boolean
  weekly: boolean
  quietStart: string
  quietEnd: string
}

const DEFAULTS: Prefs = {
  daily: true,
  wrongDue: true,
  reciteReview: true,
  streakRescue: false,
  weekly: true,
  quietStart: '22:00',
  quietEnd: '08:00'
}

const ITEMS: { key: keyof Prefs; icon: string; title: string; desc: string }[] = [
  { key: 'daily', icon: '📅', title: '每日练习提醒', desc: '每天 20:00 提醒完成今日任务' },
  { key: 'wrongDue', icon: '📕', title: '错题到期提醒', desc: '有错题到复习期时提醒重练' },
  { key: 'reciteReview', icon: '🗣️', title: '分析题温习提醒', desc: '背会超 7 天的要点待温习时提醒' },
  { key: 'streakRescue', icon: '🔥', title: '连击守护提醒', desc: '当天 21:00 仍未打卡时提醒补救' },
  { key: 'weekly', icon: '📊', title: '周报推送', desc: '每周一早上推送上周学习报告' }
]

export default function Push() {
  const theme = usePageTheme()
  const [prefs, setPrefs] = useState<Prefs>(() => {
    try { return { ...DEFAULTS, ...(Taro.getStorageSync(KEY) || {}) } } catch { return DEFAULTS }
  })

  const set = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    Taro.setStorageSync(KEY, next)
  }

  return (
    <View className={`page ${theme}`}>
      <BackBar title='推送设置' />
      <Text className='text-xs text-3 push-tip'>提醒偏好保存在本机。小程序端实际触达将通过微信订阅消息实现，APP 端通过系统通知实现（接入路径见 README）。</Text>

      <View className='card push-card'>
        {ITEMS.map((it, i) => (
          <View key={it.key} className={`push-row ${i < ITEMS.length - 1 ? 'divided' : ''}`}>
            <Text className='push-icon'>{it.icon}</Text>
            <View className='push-texts'>
              <Text className='push-title'>{it.title}</Text>
              <Text className='text-xs text-3'>{it.desc}</Text>
            </View>
            <Switch
              checked={prefs[it.key] as boolean}
              style={{ '--nutui-switch-active-background-color': '#3D7FFF' } as React.CSSProperties}
              onChange={v => set({ [it.key]: v } as Partial<Prefs>)}
            />
          </View>
        ))}
      </View>

      <View className='card push-card'>
        <View className='push-row'>
          <Text className='push-icon'>🌙</Text>
          <View className='push-texts'>
            <Text className='push-title'>免打扰时段</Text>
            <Text className='text-xs text-3'>该时段内不发送任何提醒</Text>
          </View>
          <Text className='push-quiet num'>{prefs.quietStart} - {prefs.quietEnd}</Text>
        </View>
      </View>
    </View>
  )
}
