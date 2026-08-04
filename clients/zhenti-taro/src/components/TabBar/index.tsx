import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'

const TABS = [
  { key: 'home', icon: '🏠', label: '工作台', url: '/pages/home/index' },
  { key: 'years', icon: '📄', label: '真题', url: '/pages/years/index' },
  { key: 'wrong', icon: '📕', label: '错题本', url: '/pages/wrong/index' },
  { key: 'mine', icon: '👤', label: '我的', url: '/pages/mine/index' }
]

export default function TabBar({ current, wrongDue = 0 }: { current: string; wrongDue?: number }) {
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
          {t.key === 'wrong' && wrongDue > 0 && <View className='tabbar-badge'>{wrongDue}</View>}
        </View>
      ))}
    </View>
  )
}
