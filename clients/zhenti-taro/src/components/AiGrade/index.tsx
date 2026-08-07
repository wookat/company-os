import { useState } from 'react'
import { View, Text, Textarea } from '@tarojs/components'
import { api, toast } from '../../api'
import './index.scss'

type GradeRes = { points: { i: number; hit: boolean; comment: string }[]; overall: string }

/** AI 逐点批改：写答案对照参考要点逐条判命中（对齐 app2 AiGrade），
 *  实时提示「已输入 n / 至少 20 字」；initialText 用于成绩页回显模考作答 */
export default function AiGrade({ year, seq, points, initialText }: { year: number; seq: number; points: string[]; initialText?: string }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(initialText || '')
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<GradeRes | null>(null)
  if (!open) {
    return (
      <Text className='grade-entry' onClick={() => setOpen(true)}>✍️ 写答案让 AI 逐点批改 ›</Text>
    )
  }
  const hitN = res ? res.points.filter(x => x.hit).length : 0
  const len = text.trim().length
  const doGrade = async () => {
    if (busy || len < 20) return
    setBusy(true)
    try {
      const r = await api.subjGrade(year, seq, text.trim())
      setRes(r)
    } catch (e: any) {
      toast(e.message)
    }
    setBusy(false)
  }
  return (
    <View className='grade-box'>
      <Text className='grade-title'>AI 逐点批改</Text>
      <Textarea
        className='grade-input'
        value={text}
        maxlength={2000}
        autoHeight
        placeholder='不看要点，像考场一样把答案写出来（至少 20 字），AI 会对照参考要点逐条判你答到了哪些…'
        onInput={e => setText(e.detail.value)}
      />
      <View className='grade-actions'>
        <View
          className={`btn-primary grade-btn ${busy || len < 20 ? 'disabled' : ''}`}
          onClick={doGrade}
        >{busy ? 'AI 批改中…' : res ? '重新批改' : '交给 AI 批改'}</View>
        <Text className='text-xs text-3'>
          {len > 0 && len < 20 && <Text className='grade-count num'>已输入 {len} / 至少 20 字 · </Text>}
          每日限 10 次 · 不占出题额度
        </Text>
      </View>
      {busy && <Text className='text-xs text-3 grade-loading'>AI 正在逐条对照要点批改，约 5-20 秒…</Text>}
      {res && (
        <View className='grade-result'>
          <Text className='grade-hit'>命中 <Text className='rate-ok num'>{hitN}</Text>/{points.length} 条要点</Text>
          {res.points.map(x => (
            <View key={x.i} className={`grade-point ${x.hit ? 'hit' : 'miss'}`}>
              <Text>{x.hit ? '✓' : '○'} {points[x.i]}</Text>
              {!!x.comment && <Text className='grade-comment'>{x.comment}</Text>}
            </View>
          ))}
          {!!res.overall && <Text className='text-xs text-2 grade-overall'>{res.overall}</Text>}
        </View>
      )}
    </View>
  )
}
