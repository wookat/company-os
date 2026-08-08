import React, { useState } from 'react'
import { Text, TextInput, View } from 'react-native'
import ScaleButton from './ScaleButton'
import { useToast } from './Toast'
import { ApiError, GradeRes, api } from '../lib/api'
import { usePalette } from '../lib/theme'

/** AI 逐点批改：写答案对照参考要点逐条判命中（与 Web/Taro 口径一致），
 *  实时提示「已输入 n / 至少 20 字」；initialText 用于成绩页回显模考作答 */
export default function AiGrade({
  year,
  seq,
  points,
  initialText
}: {
  year: number
  seq: number
  points: string[]
  initialText?: string
}) {
  const { toast } = useToast()
  const pal = usePalette()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(initialText ?? '')
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<GradeRes | null>(null)

  if (!open) {
    return (
      <ScaleButton className="mt-3 min-h-[44px] justify-center" haptic={false} onPress={() => setOpen(true)}>
        <Text className="text-sm font-medium text-brand dark:text-brand-dark">✍️ 写答案让 AI 逐点批改 ›</Text>
      </ScaleButton>
    )
  }

  const len = text.trim().length
  const canGrade = !busy && len >= 20
  const hitN = res ? res.points.filter(x => x.hit).length : 0

  const doGrade = async () => {
    if (!canGrade) return
    setBusy(true)
    try {
      const r = await api.subjGrade(year, seq, text.trim())
      setRes(r)
    } catch (e) {
      toast(e instanceof ApiError ? e.message : '批改失败，请重试')
    }
    setBusy(false)
  }

  return (
    <View className="mt-3 rounded-2xl bg-gray-50 p-4 dark:bg-white/5">
      <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI 逐点批改</Text>
      <TextInput
        multiline
        maxLength={2000}
        value={text}
        onChangeText={setText}
        placeholder="不看要点，像考场一样把答案写出来（至少 20 字），AI 会对照参考要点逐条判你答到了哪些…"
        placeholderTextColor={pal.text3}
        textAlignVertical="top"
        className="mt-2 min-h-[120px] rounded-xl bg-white p-3 text-sm leading-6 text-gray-900 dark:bg-cardd dark:text-gray-100"
      />
      <View className="mt-2 flex-row items-center gap-3">
        <ScaleButton
          className={`min-h-[44px] items-center justify-center rounded-xl px-4 ${
            canGrade ? 'bg-brand dark:bg-brand-dark' : 'bg-gray-300 dark:bg-white/10'
          }`}
          disabled={!canGrade}
          onPress={() => void doGrade()}
        >
          <Text className={`text-sm font-semibold ${canGrade ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
            {busy ? 'AI 批改中…' : res ? '重新批改' : '交给 AI 批改'}
          </Text>
        </ScaleButton>
        <Text className="flex-1 text-xs text-gray-400">
          {len > 0 && len < 20 ? `已输入 ${len} / 至少 20 字 · ` : ''}每日限 10 次 · 不占出题额度
        </Text>
      </View>
      {busy && <Text className="mt-2 text-xs text-gray-400">AI 正在逐条对照要点批改，约 5-20 秒…</Text>}
      {res && (
        <View className="mt-3">
          <Text className="text-sm text-gray-900 dark:text-gray-100">
            命中 <Text className="font-bold text-ok dark:text-ok-dark">{hitN}</Text>/{points.length} 条要点
          </Text>
          {res.points.map(x => (
            <View
              key={x.i}
              className={`mt-2 rounded-xl border-l-4 p-3 ${
                x.hit ? 'border-ok bg-ok/5' : 'border-gray-300 bg-white dark:border-white/20 dark:bg-cardd'
              }`}
            >
              <Text className="text-sm leading-6 text-gray-800 dark:text-gray-200">
                {x.hit ? '✓' : '○'} {points[x.i]}
              </Text>
              {!!x.comment && <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">{x.comment}</Text>}
            </View>
          ))}
          {!!res.overall && <Text className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">{res.overall}</Text>}
        </View>
      )}
    </View>
  )
}
