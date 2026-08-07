import React from 'react'
import { Pressable, PressableProps, ViewStyle } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import { hapticLight } from '../lib/haptics'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

type Props = PressableProps & {
  className?: string
  style?: ViewStyle
  haptic?: boolean
  scaleTo?: number
  children?: React.ReactNode
}

/** 按压缩放按钮：所有可点卡片/按钮的基础组件，热区 ≥44px 由调用方 className 保证 */
export default function ScaleButton({ haptic = true, scaleTo = 0.96, onPressIn, onPressOut, onPress, ...rest }: Props) {
  const scale = useSharedValue(1)
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  return (
    <AnimatedPressable
      {...rest}
      style={[rest.style, animStyle]}
      onPressIn={e => {
        scale.value = withTiming(scaleTo, { duration: 80 })
        onPressIn?.(e)
      }}
      onPressOut={e => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 })
        onPressOut?.(e)
      }}
      onPress={e => {
        if (haptic) hapticLight()
        onPress?.(e)
      }}
    />
  )
}
