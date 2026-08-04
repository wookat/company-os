import { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api, requireLogin } from '../../api'
import './index.scss'

export default function Records() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!requireLogin()) return
    api.history().then(r => setRows(r.attempts || [])).finally(() => setLoading(false))
  }, [])

  return (
    <View className='page'>
      {loading && <View className='empty'>加载中…</View>}
      {!loading && rows.length === 0 && <View className='empty'>还没有做题记录，去刷一卷真题吧</View>}
      {rows.map((a: any) => {
        const rate = a.total ? Math.round((a.score / a.total) * 100) : 0
        const c = rate < 50 ? 'rose' : rate < 70 ? 'warn' : 'ok'
        return (
          <View key={a.id} className='card rec-item' onClick={() => Taro.navigateTo({ url: `/pages/result/index?paper=${a.paper_id}` })}>
            <View className='rec-body'>
              <Text className='rec-title'>{a.title || `试卷 #${a.paper_id}`}</Text>
              <Text className='text-xs text-3'>{String(a.created_at).slice(0, 16).replace('T', ' ')} · 用时 {Math.floor((a.duration_sec || 0) / 60)} 分钟</Text>
            </View>
            <Text className={`badge badge-${c} num`}>{a.score}/{a.total}</Text>
          </View>
        )
      })}
    </View>
  )
}
