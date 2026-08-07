import { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { api, fetchMe, MeInfo, requireLogin, toast } from '../../api'
import BackBar from '../../components/BackBar'
import './index.scss'
import { usePageTheme } from '../../theme'

type Kp = { id: number; name: string; section?: string }

const COUNTS = [5, 10, 15, 20]

export default function Drill() {
  const theme = usePageTheme()
  const router = useRouter()
  const matId = parseInt(router.params.material || '0')
  const [title, setTitle] = useState('')
  const [kps, setKps] = useState<Kp[]>([])
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [count, setCount] = useState(5)
  const [essay, setEssay] = useState(false)
  const [me, setMe] = useState<MeInfo | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!requireLogin() || !matId) return
    fetchMe().then(setMe)
    api.material(matId).then(r => {
      setTitle(r.material?.title || 'AI 补练')
      const list = r.knowledge_points || []
      setKps(list)
      const preset = parseInt(Taro.getStorageSync('zt_preset_kp') || '0')
      Taro.removeStorageSync('zt_preset_kp')
      if (preset && list.some(k => k.id === preset)) setChecked(new Set([preset]))
    }).catch(e => toast(e.message))
  }, [matId])

  const toggle = (id: number) => {
    const s = new Set(checked)
    if (s.has(id)) s.delete(id); else s.add(id)
    setChecked(s)
  }

  const pickCount = (v: number) => {
    if (!me?.pro && v > 10) return toast('15/20 题为会员专属，免费版最多 10 题')
    setCount(v)
  }

  const quotaText = me && !me.pro && me.quota
    ? `免费版今日额度：${me.quota.paper_left ? `模拟卷剩 ${me.quota.paper_left} 份` : '模拟卷已用完'} · ${me.quota.quick_left ? `快练剩 ${me.quota.quick_left} 份` : '快练已用完'}，每天刷新`
    : ''

  const generate = async () => {
    if (busy) return
    if (!checked.size) return toast('先选择至少 1 个考点')
    if (!me?.pro && count > 10) return toast('15/20 题为会员功能，请先升级')
    if (!me?.pro && me?.quota) {
      if (count <= 5 && !me.quota.quick_left)
        return toast(me.quota.paper_left ? '今日快练已用完，可改选 10 题走模拟卷额度' : '今日快练已用完，明天再来')
      if (count > 5 && !me.quota.paper_left)
        return toast(me.quota.quick_left ? '今日模拟卷已用完，可改选 5 题快练' : '今日模拟卷已用完，明天再来')
    }
    setBusy(true)
    try {
      const r = await api.papersCreate(matId, count, [...checked], count > 5 && essay)
      Taro.redirectTo({ url: `/pages/exam/index?paper=${r.id}` })
    } catch (e: any) {
      toast(e.message)
      setBusy(false)
    }
  }

  return (
    <View className={`page ${theme}`}>
      <BackBar title='AI 补练' />
      <View className='card'>
        <Text className='card-title'>{title}</Text>
        <Text className='text-xs text-3 drill-sub'>AI 按真题风格出卷 · 选考点后生成，约 1-2 分钟</Text>
        <View className='drill-kps'>
          {kps.map(k => (
            <View key={k.id} className={`drill-chip ${checked.has(k.id) ? 'on' : ''}`} onClick={() => toggle(k.id)}>
              {checked.has(k.id) ? '✓ ' : ''}{k.name}
            </View>
          ))}
        </View>
      </View>

      <View className='card'>
        <Text className='card-title'>题量</Text>
        <View className='drill-counts'>
          {COUNTS.map(v => (
            <View key={v} className={`drill-count ${v === count ? 'on' : ''}`} onClick={() => pickCount(v)}>
              {v} 题{!me?.pro && v > 10 ? ' 🔒' : ''}
            </View>
          ))}
        </View>
        <View className={`drill-essay ${count <= 5 ? 'dis' : ''}`} onClick={() => count > 5 && setEssay(e => !e)}>
          <View className={`drill-essay-box ${essay && count > 5 ? 'on' : ''}`}>{essay && count > 5 ? '✓' : ''}</View>
          <Text className='text-sm text-2'>附加 1 道材料分析题（不计分，自评）</Text>
        </View>
        <Text className='text-xs text-3'>
          {me?.pro ? '会员权益：无限出卷、每卷最多 20 题。' : '免费版每天 1 份试卷 + 1 份 5 题快练，最多 10 题。'}
        </Text>
        {!!quotaText && <Text className='text-xs text-3 drill-quota'>{quotaText}</Text>}
        <View
          className={`btn-primary drill-go ${busy ? 'busy' : ''}`}
          onClick={generate}
        >{busy ? '正在创建试卷…' : `生成 ${count} 题练习卷`}</View>
      </View>
    </View>
  )
}
