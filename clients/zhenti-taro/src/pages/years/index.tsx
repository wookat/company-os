import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { api, requireLogin, toast } from '../../api'
import TabBar from '../../components/TabBar'
import './index.scss'

type YearRow = { year: number; n: number; paper_id: number | null; last_score: number | null; last_total: number | null }

export default function Years() {
  const [years, setYears] = useState<YearRow[]>([])
  const [loading, setLoading] = useState(true)

  useDidShow(() => {
    if (!requireLogin()) return
    api.realYears().then(r => setYears(r.years || [])).finally(() => setLoading(false))
  })

  const open = (y: YearRow) => {
    if (y.last_total != null && y.paper_id) {
      Taro.navigateTo({ url: `/pages/result/index?paper=${y.paper_id}` })
      return
    }
    Taro.showLoading({ title: '组卷中…' })
    api.realPaper(y.year).then(r => {
      Taro.hideLoading()
      Taro.navigateTo({ url: `/pages/exam/index?paper=${r.id}` })
    }).catch(e => { Taro.hideLoading(); toast(e.message) })
  }

  const latest = years.length ? years[0].year : 0

  return (
    <View className='page'>
      <Text className='text-xs text-3 years-tip'>2010-{latest || 2026} 历年考研政治真题 · 整卷模考 · 不占每日额度</Text>
      {loading && <View className='empty'>加载中…</View>}
      {years.map(y => {
        const isNew = y.year === latest
        const rate = y.last_total ? Math.round((y.last_score! / y.last_total) * 100) : null
        const rateCls = rate == null ? '' : rate < 50 ? 'rose' : rate < 70 ? 'warn' : 'ok'
        return (
          <View key={y.year} className={`card years-item ${isNew ? 'years-new' : ''}`} onClick={() => open(y)}>
            <View className={`years-num ${isNew ? 'num-rose' : 'num-brand'}`}>{String(y.year).slice(2)}</View>
            <View className='years-body'>
              <View className='years-title-row'>
                <Text className='years-title'>{y.year} 年真题</Text>
                {isNew && <Text className='years-newtag'>NEW</Text>}
              </View>
              <Text className='text-xs text-3'>
                {y.n} 题{rate != null ? ` · 已模考 · 得分率 ${rate}%` : ' · 未模考'}
              </Text>
            </View>
            {rate != null
              ? <Text className={`years-rate num badge badge-${rateCls}`}>{rate}%</Text>
              : <Text className={`years-cta ${isNew ? 'cta-rose' : ''}`}>模考 ›</Text>}
          </View>
        )
      })}
      <TabBar current='years' />
    </View>
  )
}
