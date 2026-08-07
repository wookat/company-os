import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useApp } from '@/lib/store'
import { nav } from '@/lib/router'
import { Button, Card, PageSkeleton } from '@/components/ui'

interface Kp {
  id: number
  name: string
  section?: string
}
interface MaterialData {
  material: { id: number; title: string }
  knowledge_points: Kp[]
}
interface Coverage {
  covered: number
  total: number
  uncovered: string[]
}

/** AI 定向补练：勾选考点 → 选题量 → 生成模拟卷（消耗出卷额度） */
export function MaterialPage({ id }: { id: number }) {
  const { me, toast } = useApp()
  const [d, setD] = useState<MaterialData | null>(null)
  const [cov, setCov] = useState<Coverage | null>(null)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [count, setCount] = useState(10)
  const [essay, setEssay] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([
      api<MaterialData>('/materials/' + id),
      api<Coverage>(`/materials/${id}/coverage`).catch(() => null),
    ])
      .then(([dd, c]) => {
        setD(dd)
        setCov(c)
        const preset = sessionStorage.getItem('zt_preset_kp')
        sessionStorage.removeItem('zt_preset_kp')
        if (preset && dd.knowledge_points.some((k) => String(k.id) === preset)) {
          setChecked(new Set([+preset]))
          toast('已只勾选该薄弱考点，选择题量后生成即可定向特训', true)
        } else {
          setChecked(new Set(dd.knowledge_points.map((k) => k.id)))
        }
      })
      .catch((e) => {
        toast(e.message)
        nav('home')
      })
  }, [id, toast])

  if (!d) return <PageSkeleton />

  const toggle = (kid: number) =>
    setChecked((s) => {
      const n = new Set(s)
      if (n.has(kid)) n.delete(kid)
      else n.add(kid)
      return n
    })

  const gen = async () => {
    if (!me?.pro && count > 10) return toast('15/20 题为会员功能，请先升级')
    if (!me?.pro && me?.quota) {
      if (count <= 5 && !me.quota.quick_left)
        return toast(me.quota.paper_left ? '今日快练已用完，可改选 10 题走模拟卷额度' : '今日快练已用完，明天再来')
      if (count > 5 && !me.quota.paper_left)
        return toast(me.quota.quick_left ? '今日模拟卷已用完，可改选 5 题快练' : '今日模拟卷已用完，明天再来')
    }
    setBusy(true)
    try {
      const d2 = await api<{ id: number }>('/papers', {
        method: 'POST',
        body: JSON.stringify({ material_id: id, count, kp_ids: [...checked], essay: count > 5 && essay }),
      })
      toast('已提交生成，约 1-2 分钟，完成后在工作台开始答题', true)
      nav('exam/' + d2.id)
    } catch (e) {
      toast((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{d.material.title}</h1>
        <button onClick={() => nav('home')} className="text-sm text-ink-3 hover:text-brand-600">
          ← 工作台
        </button>
      </div>
      <p className="mt-1 text-sm text-ink-2">勾选本次要考的考点（默认全选），选择题量后生成。</p>
      {cov ? (
        <Card className="mt-3 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">累计考点覆盖</span>
            <span className="text-ink-2 font-num">
              {cov.covered} / {cov.total}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/5">
            <div className="h-full bg-brand-500" style={{ width: `${cov.total ? (cov.covered / cov.total) * 100 : 0}%` }} />
          </div>
          {cov.uncovered.length ? (
            <button
              onClick={() => {
                const names = new Set(cov.uncovered)
                setChecked(new Set(d.knowledge_points.filter((k) => names.has(k.name)).map((k) => k.id)))
                toast('已勾选未考过的考点', true)
              }}
              className="mt-2 text-xs text-brand-600"
            >
              仅勾选尚未考过的 {cov.uncovered.length} 个考点
            </button>
          ) : (
            <p className="mt-2 text-xs text-emerald-600">全部考点已至少考过一次</p>
          )}
        </Card>
      ) : null}
      <Card className="mt-4 max-h-96 space-y-1 overflow-y-auto p-4">
        {d.knowledge_points.map((k) => (
          <label key={k.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-page">
            <input type="checkbox" className="h-4 w-4 shrink-0 rounded accent-brand-600" checked={checked.has(k.id)} onChange={() => toggle(k.id)} />
            <span>{k.name}</span>
            <span className="text-xs text-ink-3">{k.section || ''}</span>
          </label>
        ))}
      </Card>
      <div className="mt-4">
        <div className="inline-flex flex-wrap rounded-xl border border-ink/10 bg-card p-1 text-sm">
          {(
            [
              [5, '5 题·快练'],
              [10, '10 题'],
              [15, `15 题${me?.pro ? '' : ' 🔒'}`],
              [20, `20 题${me?.pro ? '' : ' 🔒'}`],
            ] as [number, string][]
          ).map(([v, t]) => (
            <button
              key={v}
              onClick={() => {
                if (!me?.pro && v > 10) return toast('15/20 题为会员专属，免费版最多 10 题')
                setCount(v)
                if (v <= 5) setEssay(false)
              }}
              className={`rounded-lg px-3.5 py-2 font-medium ${v === count ? 'bg-brand-500 text-white' : 'text-ink-2 hover:bg-page'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <label className={`mt-3 flex items-center gap-2.5 px-1 text-sm text-ink-2 ${count <= 5 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
          <input type="checkbox" className="h-4 w-4 rounded accent-brand-600" disabled={count <= 5} checked={essay} onChange={(e) => setEssay(e.target.checked)} />
          <span>附加 1 道材料分析题（主观题，交卷后对照参考要点自评，仅 10 题及以上模拟卷）</span>
        </label>
        <Button
          size="lg"
          className="mt-3 w-full"
          disabled={busy || (!me?.pro && !!me?.quota && !me.quota.paper_left && !me.quota.quick_left)}
          onClick={gen}
        >
          {busy
            ? '⏳ 已提交，正在生成…'
            : !me?.pro && me?.quota && !me.quota.paper_left && !me.quota.quick_left
              ? '今日免费额度已用完'
              : '生成仿真模拟卷'}
        </Button>
      </div>
      <p className="mt-2 text-xs text-ink-3">
        生成含逐考点命题、查重与 AI 审校，约 1-2 分钟。
        {me?.pro ? '会员权益：无限出卷、每卷最多 20 题。' : '免费版每天 1 份试卷 + 1 份 5 题快练，最多 10 题。'}
      </p>
      {!me?.pro && me?.quota ? (
        <p className="mt-1 text-xs text-ink-2 font-num">
          免费版今日额度：{me.quota.paper_left ? `模拟卷剩 ${me.quota.paper_left} 份` : '模拟卷已用完'} ·{' '}
          {me.quota.quick_left ? `快练剩 ${me.quota.quick_left} 份` : '快练已用完'}，每天刷新
        </p>
      ) : null}
    </div>
  )
}
