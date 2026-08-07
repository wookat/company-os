import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { api, requireLogin, toast } from '../../api'
import TabBar from '../../components/TabBar'
import SprintBack from '../../components/SprintBack'
import './index.scss'
import { usePageTheme } from '../../theme'

type YearRow = { year: number; n: number; paper_id: number | null; last_score: number | null; last_total: number | null }

export default function Years() {
  const theme = usePageTheme()
  const [years, setYears] = useState<YearRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sz, setSz] = useState<{ total: number; latest_ym: string | null; latest_count: number } | null>(null)
  const [hotKps, setHotKps] = useState<{ kp_name: string; n: number }[]>([])
  const [mockYear, setMockYear] = useState<YearRow | null>(null)
  const [mockBusy, setMockBusy] = useState(false)

  useDidShow(() => {
    if (!requireLogin()) return
    api.realYears().then(r => setYears(r.years || [])).finally(() => setLoading(false))
    api.shizhengStats().then(setSz).catch(() => {})
    // 热门考点：按题量 Top6，点击直达考点搜索（对齐 app2）
    if (!hotKps.length) api.realKps().then(r => setHotKps([...(r.kps || [])].sort((a, b) => b.n - a.n).slice(0, 6))).catch(() => {})
  })

  const goShizheng = () => {
    Taro.showLoading({ title: '组卷中…' })
    api.realShizheng().then(r => {
      Taro.hideLoading()
      Taro.navigateTo({ url: `/pages/exam/index?paper=${r.id}` })
    }).catch(e => { Taro.hideLoading(); toast(e.message) })
  }
  const thisYm = new Date().toISOString().slice(0, 7)

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

  // 全真模考：说明弹窗确认后组卷/复用（客观题全量 + 5 道分析题，180 分钟）
  const startMock = async (y: YearRow) => {
    if (mockBusy) return
    setMockBusy(true)
    Taro.showLoading({ title: '组卷中…' })
    try {
      const r = await api.realMockPaper(y.year)
      Taro.hideLoading()
      try { Taro.setStorageSync(`zt_timed_${r.id}`, '1') } catch { }
      setMockYear(null)
      Taro.navigateTo({ url: `/pages/exam/index?paper=${r.id}` })
    } catch (e: any) {
      Taro.hideLoading()
      toast(e.message)
    }
    setMockBusy(false)
  }

  const latest = years.length ? years[0].year : 0

  return (
    <View className={`page ${theme}`}>
      <View className='years-quick'>
        <View className='years-quick-item' onClick={() => Taro.navigateTo({ url: '/pages/kps/index' })}>🎯 按考点选题</View>
        <View className='years-quick-item' onClick={() => Taro.navigateTo({ url: '/pages/search/index' })}>🔍 搜真题</View>
        <View className='years-quick-item' onClick={() => Taro.navigateTo({ url: '/pages/favs/index' })}>⭐ 真题收藏</View>
      </View>
      {hotKps.length > 0 && (
        <View className='years-hotkps'>
          <Text className='text-xs text-3'>热门考点：</Text>
          {hotKps.map(k => (
            <Text
              key={k.kp_name}
              className='years-hotkp'
              onClick={() => Taro.navigateTo({ url: `/pages/search/index?kw=${encodeURIComponent(k.kp_name)}` })}
            >{k.kp_name}</Text>
          ))}
        </View>
      )}
      {/* 时政月更专区（对齐 app2 #real 时政入口） */}
      <View className='years-sz' onClick={goShizheng}>
        <Text className='years-sz-icon'>📰</Text>
        <View className='years-sz-body'>
          <View className='years-sz-title-row'>
            <Text className='years-sz-title'>时政月更专区 · 形势与政策</Text>
            <Text className='years-sz-badge'>{sz && sz.latest_ym === thisYm ? `本月已更新 ${sz.latest_count} 题` : 'NEW'}</Text>
          </View>
          <Text className='years-sz-sub'>
            近一年重大时政，学科专家逐月手工命题{sz && sz.latest_ym ? ` · 更新至 ${sz.latest_ym}` : ''}
          </Text>
        </View>
        <Text className='years-sz-cta'>›</Text>
      </View>
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
            <Text className='years-mock-btn' onClick={e => { e.stopPropagation(); setMockYear(y) }}>全真模考</Text>
          </View>
        )
      })}

      {/* 全真模考说明弹窗（题量动态：客观 n 题 + 5 道分析题） */}
      {mockYear && (
        <View className='years-mock-mask' onClick={() => setMockYear(null)}>
          <View className='years-mock-modal card' onClick={e => e.stopPropagation()}>
            <Text className='card-title'>{mockYear.year} 年全真模考</Text>
            <View className='years-mock-rules'>
              <Text className='text-sm text-2'>📝 整卷 {mockYear.n + 5} 题：{mockYear.n} 道客观题（单选 + 多选）+ 5 道材料分析题，先客观后主观，可自由跳转</Text>
              <Text className='text-sm text-2'>⏱ 限时 180 分钟倒计时，到时自动交卷；作答自动保存，刷新不丢</Text>
              <Text className='text-sm text-2'>✅ 客观题自动判分（单选 1 分 / 多选 2 分{mockYear.n === 33 ? '，共 50 分' : ''}）；分析题对照参考要点自评，也可交给 AI 逐点批改（每日 10 次）</Text>
              <Text className='text-sm text-2'>🆓 真题免费，不占出题额度；同一年份复用同一张卷，已考完的年份将直接进入成绩页复盘</Text>
            </View>
            <View className='btn-primary' onClick={() => startMock(mockYear)}>{mockBusy ? '组卷中…' : '开始模考'}</View>
            <View className='btn-secondary years-mock-cancel' onClick={() => setMockYear(null)}>再想想</View>
          </View>
        </View>
      )}
      <SprintBack />
      <TabBar current='years' />
    </View>
  )
}
