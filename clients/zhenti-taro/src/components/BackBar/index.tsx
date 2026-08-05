import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'

// H5/APP 壳下子页页内返回；小程序保留原生导航栏，不渲染
export default function BackBar({ title }: { title: string }) {
  if (process.env.TARO_ENV !== 'h5') return null
  const back = () => {
    if (Taro.getCurrentPages().length > 1) Taro.navigateBack()
    else Taro.redirectTo({ url: '/pages/home/index' })
  }
  return (
    <View className='backbar' onClick={back}>
      <Text className='backbar-arrow'>‹</Text>
      <Text>返回</Text>
      <Text className='text-3' style={{ fontWeight: 400 }}> · {title}</Text>
    </View>
  )
}
