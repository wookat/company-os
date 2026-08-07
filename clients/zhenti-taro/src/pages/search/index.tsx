import { useEffect, useState } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { api, getToken, requireLogin, toast } from '../../api'
import BackBar from '../../components/BackBar'
import './index.scss'

type Q = {
  id: number; year: number; seq: number; qtype: string; stem: string
  opt_a: string; opt_b: string; opt_c: string; opt_d: string
  answer: string; analysis?: string; subject?: string; kp_name?: string
}
type SubjRow = { year: number; seq: number; subject?: string; kp_name?: string; brief?: string }

// 「年份+题号」直达：如「2019 30」「2019年第30题」「2019-30」
const DIRECT_RE = /^(20(?:1[0-9]|2[0-6]))\s*年?\s*[-第\s]?\s*(\d{1,2})\s*题?$/

export default function Search() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [searched, setSearched] = useState(false)
  const [direct, setDirect] = useState<{ year: number; seq: number; q?: Q; subj?: SubjRow } | null>(null)
  const [questions, setQuestions] = useState<Q[]>([])
  const [subjective, setSubjective] = useState<SubjRow[]>([])
  const [open, setOpen] = useState<Set<number>>(new Set())
  const [favIds, setFavIds] = useState<Set<number>>(new Set())

  // 进页回填收藏状态，保证 ★ 正确回显
  useDidShow(() => {
    if (!getToken()) return
    api.realFavs().then(f => setFavIds(new Set((f.questions || []).map((x: any) => x.id)))).catch(() => {})
  })

  // 携 kw 参数进页（如热门考点 chip）时自动搜索直达
  useEffect(() => {
    const kw = decodeURIComponent(router.params.kw || '').trim()
    if (kw) { setQ(kw); doSearch(kw) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doSearch = async (preset?: string) => {
    const kw = (preset ?? q).trim()
    if (!kw) return toast('请输入关键词，如“量变” 或 “2019年第30题”')
    if (!requireLogin()) return
    setBusy(true)
    setSearched(true)
    setDirect(null)
    try {
      const m = kw.match(DIRECT_RE)
      if (m) {
        const year = +m[1], seq = +m[2]
        const d: { year: number; seq: number; q?: Q; subj?: SubjRow } = { year, seq }
        try {
          const b = await api.realBrowse(year)
          const hitQ = (b.questions || []).find((x: Q) => x.seq === seq)
          if (hitQ) d.q = { ...hitQ, year: hitQ.year || year }
        } catch { }
        if (!d.q) {
          try {
            const s = await api.subjective(year)
            const hit = (s.questions || []).find((x: any) => x.seq === seq)
            if (hit) d.subj = { year, seq, subject: hit.subject, kp_name: hit.kp_name, brief: String(hit.stem || '').slice(0, 80) }
          } catch { }
        }
        setDirect(d)
        setQuestions([])
        setSubjective([])
        return
      }
      const r = await api.realSearch(kw)
      setQuestions(r.questions || [])
      setSubjective(r.subjective || [])
    } catch (e: any) {
      toast(e.message)
    } finally {
      setBusy(false)
    }
  }

  const toggleFav = async (id: number) => {
    try {
      if (favIds.has(id)) { await api.realFavDel(id); favIds.delete(id); toast('已取消收藏') }
      else { await api.realFavAdd(id); favIds.add(id); toast('已收藏 ★', 'success') }
      setFavIds(new Set(favIds))
    } catch (e: any) { toast(e.message) }
  }

  const kpDrill = (name: string) => {
    Taro.showLoading({ title: '考点组卷中…' })
    api.realKp(name).then(r => {
      Taro.hideLoading()
      Taro.navigateTo({ url: `/pages/exam/index?paper=${r.id}` })
    }).catch(e => { Taro.hideLoading(); toast(e.message) })
  }

  const renderQ = (x: Q, expanded: boolean) => (
    <View key={x.id} className='card search-q'>
      <View className='search-q-meta'>
        <Text className='badge badge-brand'>{x.year} 年第 {x.seq} 题</Text>
        <Text className='text-xs text-3'>{x.qtype === 'multi' ? '多选' : '单选'}{x.kp_name ? ` · ${x.kp_name}` : ''}</Text>
        <Text className={`search-star ${favIds.has(x.id) ? 'on' : ''}`} onClick={() => toggleFav(x.id)}>{favIds.has(x.id) ? '★' : '☆'}</Text>
      </View>
      <Text className='search-q-stem'>{x.stem}</Text>
      {expanded ? (
        <View className='search-q-detail'>
          {([['A', x.opt_a], ['B', x.opt_b], ['C', x.opt_c], ['D', x.opt_d]] as const).map(([k, v]) => (
            <Text key={k} className={`search-q-opt ${x.answer.includes(k) ? 'right' : ''}`}>{x.answer.includes(k) ? '✓ ' : ''}{k}. {v}</Text>
          ))}
          {!!x.analysis && <Text className='text-xs text-2 search-q-ana'>解析:{x.analysis}</Text>}
          {!!x.kp_name && (
            <View className='btn-secondary search-q-btn' onClick={() => kpDrill(x.kp_name!)}>这个考点直练:{x.kp_name} ›</View>
          )}
        </View>
      ) : (
        <Text className='text-xs search-q-more' onClick={() => setOpen(s => new Set(s).add(x.id))}>看答案与解析 ›</Text>
      )}
    </View>
  )

  return (
    <View className='page'>
      <BackBar title='搜真题' />
      <View className='card search-bar'>
        <Input
          className='search-input'
          value={q}
          confirmType='search'
          placeholder='考点/关键词，或 2019 30、2019年第30题'
          onInput={e => setQ(e.detail.value)}
          onConfirm={() => doSearch()}
        />
        <View className='search-btn' onClick={() => doSearch()}>{busy ? '…' : '搜索'}</View>
      </View>

      {direct && (
        <View className='card search-direct'>
          <Text className='card-title'>直达 {direct.year} 年第 {direct.seq} 题</Text>
          {direct.q && <View className='search-direct-q'>{renderQ(direct.q, true)}</View>}
          {direct.subj && (
            <View className='search-direct-subj'>
              <Text className='text-sm'>{direct.subj.brief}…</Text>
              <Text className='text-xs text-3'>分析题 · {direct.subj.subject || ''}{direct.subj.kp_name ? ` · ${direct.subj.kp_name}` : ''}</Text>
              <View className='btn-secondary search-q-btn' onClick={() => Taro.navigateTo({ url: '/pages/recite/index' })}>去分析题背诵页看参考要点 ›</View>
            </View>
          )}
          {!direct.q && !direct.subj && <Text className='text-xs text-3'>未找到该题，可能是分析题材料或该年份未上架</Text>}
        </View>
      )}

      {!direct && questions.map(x => renderQ(x, open.has(x.id)))}

      {!direct && subjective.length > 0 && (
        <View className='card'>
          <Text className='card-title'>相关分析题</Text>
          {subjective.map(s => (
            <View key={`${s.year}-${s.seq}`} className='search-subj' onClick={() => Taro.navigateTo({ url: '/pages/recite/index' })}>
              <Text className='badge badge-warn'>{s.year} 年第 {s.seq} 题</Text>
              <Text className='text-xs text-2 search-subj-brief'>{s.brief}…</Text>
            </View>
          ))}
        </View>
      )}

      {searched && !busy && !direct && questions.length === 0 && subjective.length === 0 && (
        <View className='empty'>没有找到相关真题，换个关键词试试</View>
      )}
    </View>
  )
}
