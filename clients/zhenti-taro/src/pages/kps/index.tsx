import { useMemo, useState } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { api, requireLogin, toast } from '../../api'
import BackBar from '../../components/BackBar'
import './index.scss'
import { usePageTheme } from '../../theme'

type KpRow = { kp_name: string; n: number; subject?: string }

export default function Kps() {
  const theme = usePageTheme()
  const router = useRouter()
  const [kps, setKps] = useState<KpRow[]>([])
  const [q, setQ] = useState(() => decodeURIComponent(router.params.kw || ''))
  const [loading, setLoading] = useState(true)

  useDidShow(() => {
    if (!requireLogin()) return
    api.realKps().then(r => setKps(r.kps || [])).catch(e => toast(e.message)).finally(() => setLoading(false))
  })

  // 按科目分组 + 就地过滤（过滤后空组隐藏）
  const groups = useMemo(() => {
    const g: Record<string, KpRow[]> = {}
    for (const k of kps) {
      const s = k.subject || '其他'
      ;(g[s] = g[s] || []).push(k)
    }
    const kw = q.trim()
    return Object.entries(g)
      .map(([sub, rows]) => [sub, kw ? rows.filter(k => k.kp_name.includes(kw)) : rows] as const)
      .filter(([, rows]) => rows.length > 0)
  }, [kps, q])

  const drill = (name: string) => {
    Taro.showLoading({ title: '考点组卷中…' })
    api.realKp(name).then(r => {
      Taro.hideLoading()
      Taro.navigateTo({ url: `/pages/exam/index?paper=${r.id}` })
    }).catch(e => { Taro.hideLoading(); toast(e.message) })
  }

  const aiDrill = (name: string) => {
    Taro.showLoading({ title: '定位考点…' })
    api.kpdrill(name).then(r => {
      Taro.hideLoading()
      Taro.setStorageSync('zt_preset_kp', String(r.kp_id))
      Taro.navigateTo({ url: `/pages/drill/index?material=${r.material_id}` })
    }).catch(e => { Taro.hideLoading(); toast(e.message) })
  }

  return (
    <View className={`page ${theme}`}>
      <BackBar title='按考点选题' />
      <View className='card kps-search-card'>
        <Input
          className='kps-input'
          value={q}
          placeholder='输考点名就地过滤，如“量变”“抗日”…'
          onInput={e => setQ(e.detail.value)}
        />
        <Text className='text-xs text-3'>点考点直练真题；长按/点「AI」按该考点 AI 补练</Text>
      </View>

      {loading && <View className='empty'>加载考点…</View>}
      {!loading && groups.length === 0 && <View className='empty'>没有匹配“{q.trim()}”的考点</View>}

      {groups.map(([sub, rows]) => (
        <View key={sub} className='card'>
          <Text className='card-title'>{sub}<Text className='text-xs text-3 num'>（{rows.length}）</Text></Text>
          <View className='kps-chips'>
            {rows.map(k => (
              <View key={k.kp_name} className='kps-chip-wrap'>
                <View className='kps-chip' onClick={() => drill(k.kp_name)}>
                  {k.kp_name} <Text className='text-xs text-3 num'>{k.n}</Text>
                </View>
                <View className='kps-chip-ai' onClick={() => aiDrill(k.kp_name)}>AI</View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  )
}
