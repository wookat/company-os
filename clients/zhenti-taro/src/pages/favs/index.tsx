import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { api, requireLogin, toast } from '../../api'
import BackBar from '../../components/BackBar'
import './index.scss'
import { usePageTheme } from '../../theme'

type Q = {
  id: number; year: number; seq: number; qtype: string; stem: string
  opt_a: string; opt_b: string; opt_c: string; opt_d: string
  answer: string; analysis?: string; kp_name?: string
}

export default function Favs() {
  const theme = usePageTheme()
  const [list, setList] = useState<Q[]>([])
  const [open, setOpen] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)

  useDidShow(() => {
    if (!requireLogin()) return
    api.realFavs().then(r => setList(r.questions || [])).catch(e => toast(e.message)).finally(() => setLoading(false))
  })

  const unfav = async (id: number) => {
    try {
      await api.realFavDel(id)
      setList(l => l.filter(x => x.id !== id))
      toast('已取消收藏')
    } catch (e: any) { toast(e.message) }
  }

  const favPaper = () => {
    if (!list.length) return toast('还没有收藏真题，先在搜索/每日一题里点 ☆ 收藏')
    Taro.showLoading({ title: '组卷中…' })
    api.realFavPaper().then(r => {
      Taro.hideLoading()
      Taro.navigateTo({ url: `/pages/exam/index?paper=${r.id}` })
    }).catch(e => { Taro.hideLoading(); toast(e.message) })
  }

  return (
    <View className={`page ${theme}`}>
      <BackBar title='真题收藏' />
      <View className='card favs-head'>
        <View>
          <Text className='card-title'>真题收藏</Text>
          <Text className='text-xs text-3 favs-sub'>共 {list.length} 题 · 与 Web 端同步</Text>
        </View>
        <View className='btn-secondary favs-paper-btn' onClick={favPaper}>收藏自测卷 ›</View>
      </View>

      {loading && <View className='empty'>加载中…</View>}
      {!loading && list.length === 0 && <View className='empty'>暂无收藏，在搜索结果或错题本点 ☆ 收藏</View>}

      {list.map(x => {
        const expanded = open.has(x.id)
        return (
          <View key={x.id} className='card favs-q'>
            <View className='favs-q-meta'>
              <Text className='badge badge-brand'>{x.year} 年第 {x.seq} 题</Text>
              <Text className='text-xs text-3'>{x.qtype === 'multi' ? '多选' : '单选'}{x.kp_name ? ` · ${x.kp_name}` : ''}</Text>
              <Text className='favs-star on' onClick={() => unfav(x.id)}>★</Text>
            </View>
            <Text className='favs-q-stem'>{x.stem}</Text>
            {expanded ? (
              <View className='favs-q-detail'>
                {([['A', x.opt_a], ['B', x.opt_b], ['C', x.opt_c], ['D', x.opt_d]] as const).map(([k, v]) => (
                  <Text key={k} className={`favs-q-opt ${x.answer.includes(k) ? 'right' : ''}`}>{x.answer.includes(k) ? '✓ ' : ''}{k}. {v}</Text>
                ))}
                {!!x.analysis && <Text className='text-xs text-2 favs-q-ana'>解析：{x.analysis}</Text>}
              </View>
            ) : (
              <Text className='text-xs favs-q-more' onClick={() => setOpen(s => new Set(s).add(x.id))}>看答案与解析 ›</Text>
            )}
          </View>
        )
      })}
    </View>
  )
}
