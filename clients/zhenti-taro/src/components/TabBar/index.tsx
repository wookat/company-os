import { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, getToken } from '../../api'

const TABS = [
  { key: 'home', icon: '🏠', label: '工作台', url: '/pages/home/index' },
  { key: 'years', icon: '📄', label: '真题', url: '/pages/years/index' },
  { key: 'wrong', icon: '📕', label: '错题本', url: '/pages/wrong/index' },
  { key: 'mine', icon: '👤', label: '我的', url: '/pages/mine/index' }
]

// 到期错题角标：轻量 /api/wrongdue，切页（TabBar 重挂载）+ 回前台刷新
export default function TabBar({ current, wrongDue }: { current: string; wrongDue?: number }) {
  const [due, setDue] = useState(wrongDue || 0)

  useEffect(() => {
    if (!getToken()) return
    const load = () => api.wrongDueCount().then(d => setDue(d.due || 0)).catch(() => {})
    load()
    if (process.env.TARO_ENV === 'h5') {
      const onVis = () => document.visibilityState === 'visible' && load()
      document.addEventListener('visibilitychange', onVis)
      return () => document.removeEventListener('visibilitychange', onVis)
    }
    const onShow = () => load()
    Taro.onAppShow?.(onShow)
    return () => Taro.offAppShow?.(onShow)
  }, [])

  return (
    <View className='tabbar'>
      {TABS.map(t => (
        <View
          key={t.key}
          className={`tabbar-item ${current === t.key ? 'active' : ''}`}
          onClick={() => { if (current !== t.key) Taro.redirectTo({ url: t.url }) }}
        >
          <Text className='tabbar-icon'>{t.icon}</Text>
          <Text>{t.label}</Text>
          {t.key === 'wrong' && due > 0 && <View className='tabbar-badge'>{due > 99 ? '99+' : due}</View>}
        </View>
      ))}
    </View>
  )
}
