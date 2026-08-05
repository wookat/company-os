import { useEffect, useState } from 'react'
import { View, Text, Canvas, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { toast } from '../../api'
import './index.scss'

export type ShareSpec =
  | { kind: 'streak'; streak: number; total: number; daysLeft: number }
  | { kind: 'score'; pct: number; score: number; total: number; title: string; beat?: number | null; grade: string }

const W = 640
const H = 800

// 品牌分享卡：蓝紫渐变 + 大数字 + 域名，样式对齐 app2 Web 版
function draw(x: CanvasRenderingContext2D, spec: ShareSpec) {
  const g = x.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, '#3D7FFF')
  g.addColorStop(1, '#7C4DFF')
  x.fillStyle = g
  x.fillRect(0, 0, W, H)
  x.fillStyle = 'rgba(255,255,255,0.12)'
  x.beginPath(); x.arc(560, 90, 130, 0, Math.PI * 2); x.fill()
  x.beginPath(); x.arc(70, 730, 100, 0, Math.PI * 2); x.fill()
  x.textAlign = 'center'
  x.fillStyle = 'rgba(255,255,255,0.85)'
  x.font = '600 30px sans-serif'
  x.fillText('真题工坊 · 考研政治', W / 2, 96)

  if (spec.kind === 'streak') {
    x.font = '600 34px sans-serif'
    x.fillText('每日一题打卡', W / 2, 200)
    x.fillStyle = '#fff'
    x.font = '800 170px sans-serif'
    x.fillText(String(spec.streak), W / 2, 420)
    x.font = '600 36px sans-serif'
    x.fillText('天连续打卡', W / 2, 480)
    x.fillStyle = 'rgba(255,255,255,0.9)'
    x.font = '28px sans-serif'
    x.fillText(`累计打卡 ${spec.total} 天 · 距考研还有 ${spec.daysLeft} 天`, W / 2, 560)
  } else {
    x.font = '600 34px sans-serif'
    x.fillText(spec.title.slice(0, 16), W / 2, 200)
    x.fillStyle = '#fff'
    x.font = '800 170px sans-serif'
    x.fillText(`${spec.pct}%`, W / 2, 420)
    x.font = '600 32px sans-serif'
    x.fillText(`答对 ${spec.score}/${spec.total} 题`, W / 2, 476)
    x.fillStyle = 'rgba(255,255,255,0.9)'
    x.font = '28px sans-serif'
    // 正确率 <40% 不显示「击败 X% 研友」，改评语口径
    x.fillText(
      spec.pct >= 40 && typeof spec.beat === 'number' && spec.beat >= 20 ? `击败了 ${spec.beat}% 的研友` : spec.grade.slice(0, 20),
      W / 2,
      560
    )
  }

  x.fillStyle = 'rgba(255,255,255,0.7)'
  x.font = '26px sans-serif'
  x.fillText('zhenti.zalize.com', W / 2, 716)
}

export default function ShareCard({ spec, onClose }: { spec: ShareSpec | null; onClose: () => void }) {
  const isH5 = process.env.TARO_ENV === 'h5'
  const [h5Url, setH5Url] = useState('')
  const [wxCanvas, setWxCanvas] = useState<any>(null)

  useEffect(() => {
    if (!spec) return
    if (isH5) {
      const c = document.createElement('canvas')
      c.width = W; c.height = H
      draw(c.getContext('2d')!, spec)
      setH5Url(c.toDataURL('image/png'))
      return
    }
    // 小程序：Canvas 2D 节点绘制
    setTimeout(() => {
      Taro.createSelectorQuery()
        .select('#share-canvas')
        .fields({ node: true, size: true })
        .exec(res => {
          const node = res && res[0] && res[0].node
          if (!node) return
          node.width = W
          node.height = H
          draw(node.getContext('2d'), spec)
          setWxCanvas(node)
        })
    }, 120)
  }, [spec, isH5])

  if (!spec) return null

  const save = async () => {
    if (isH5) {
      const a = document.createElement('a')
      a.href = h5Url
      a.download = spec.kind === 'streak' ? 'zhenti-checkin.png' : 'zhenti-score.png'
      a.click()
      toast('图片已导出', 'success')
      return
    }
    if (!wxCanvas) return toast('图片还在生成中…')
    try {
      const r = await Taro.canvasToTempFilePath({ canvas: wxCanvas } as any)
      await Taro.saveImageToPhotosAlbum({ filePath: r.tempFilePath })
      toast('已保存到相册', 'success')
    } catch (e: any) {
      if (String(e && e.errMsg).includes('auth')) {
        const m = await Taro.showModal({ title: '需要相册权限', content: '请在设置中允许保存到相册后重试' })
        if (m.confirm) Taro.openSetting()
      } else toast('保存失败，请重试')
    }
  }

  return (
    <View className='share-mask' onClick={onClose}>
      <View className='share-panel' onClick={e => e.stopPropagation()}>
        <View className='share-close' onClick={onClose}>✕</View>
        {isH5
          ? (h5Url ? <Image className='share-img' src={h5Url} mode='widthFix' /> : <View className='empty'>生成中…</View>)
          : <Canvas type='2d' id='share-canvas' className='share-img' />}
        <View className='share-actions'>
          <View className='btn-secondary share-btn' onClick={onClose}>关闭</View>
          <View className='btn-primary share-btn' onClick={save}>{isH5 ? '导出图片' : '保存到相册'}</View>
        </View>
        <Text className='text-xs text-3 share-tip'>保存后分享给研友，一起上岸 zhenti.zalize.com</Text>
      </View>
    </View>
  )
}
