import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import React from 'react'
import { usePalette } from '../../lib/theme'

export default function TabLayout() {
  const pal = usePalette()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: pal.brand,
        tabBarInactiveTintColor: pal.text3,
        tabBarStyle: {
          backgroundColor: pal.card,
          borderTopColor: pal.border,
          height: 62,
          paddingTop: 6
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: '刷真题',
          tabBarIcon: ({ color, size }) => <Ionicons name="book" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="wrong"
        options={{
          title: '错题本',
          tabBarIcon: ({ color, size }) => <Ionicons name="alert-circle" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />
        }}
      />
    </Tabs>
  )
}
