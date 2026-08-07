import { useEffect, useState } from 'react'
import { View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import './index.scss'

export const SPRINT_BACK_KEY = 'zt_sprint_back'

/** 从冲刺包直达其他页面后，提供回冲刺包的悬浮胶囊（答题页不挂载；回到冲刺包页自动清除） */
export default function SprintBack() {
  const [show, setShow] = useState(false)
  const read = () => {
    try { setShow(Taro.getStorageSync(SPRINT_BACK_KEY) === '1') } catch { setShow(false) }
  }

  useEffect(read, [])
  useDidShow(read)

  if (!show) return null
  return (
    <View
      className='sprint-back-pill'
      onClick={() => {
        try { Taro.removeStorageSync(SPRINT_BACK_KEY) } catch { }
        Taro.navigateTo({ url: '/pages/sprint/index' })
      }}
    >⚡ 回冲刺包</View>
  )
}
