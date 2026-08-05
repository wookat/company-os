import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useApp } from '@/lib/store'
import { nav } from '@/lib/router'
import { Button, Card, Input } from '@/components/ui'

export function AccountPage() {
  const { me, loadMe, logout, toast } = useApp()
  const [code, setCode] = useState('')
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newPw2, setNewPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [remind, setRemind] = useState<boolean | null>(null)

  useEffect(() => {
    api<{ on: boolean }>('/remind')
      .then((d) => setRemind(d.on))
      .catch(() => setRemind(false))
  }, [])

  if (!me) return null

  const toggleRemind = async () => {
    const next = !remind
    setRemind(next)
    try {
      await api('/remind', { method: 'POST', body: JSON.stringify({ on: next }) })
      toast(next ? '已开启，每天 8:00 邮件提醒（已打卡当天不发）' : '已关闭每日提醒邮件', true)
    } catch (e) {
      setRemind(!next)
      toast((e as Error).message)
    }
  }

  const redeem = async () => {
    try {
      await api('/redeem', { method: 'POST', body: JSON.stringify({ code }) })
      await loadMe()
      setCode('')
      toast('兑换成功，会员已开通', true)
    } catch (e) {
      toast((e as Error).message)
    }
  }

  const changePw = async () => {
    if (newPw.length < 6) return toast('新密码至少 6 位')
    if (newPw !== newPw2) return toast('两次输入的新密码不一致')
    setBusy(true)
    try {
      await api('/password', { method: 'PUT', body: JSON.stringify({ old_password: oldPw, new_password: newPw }) })
      toast('密码已修改，下次登录请使用新密码', true)
      setOldPw('')
      setNewPw('')
      setNewPw2('')
    } catch (e) {
      toast((e as Error).message)
    }
    setBusy(false)
  }

  const copyInvite = () => {
    const v = `https://zhenti.zalize.com/app2/#reg-${me.invite_code || ''}`
    navigator.clipboard
      .writeText(v)
      .then(() => toast('邀请链接已复制，发给研友吧', true))
      .catch(() => toast('复制失败，请手动复制'))
  }

  return (
    <div className="space-y-4 pt-4">
      <h1 className="text-xl font-bold">我的</h1>
      <Card className="flex items-center gap-4 p-5">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-50 text-xl font-bold text-brand-600">
          {(me.email || 'U')[0].toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{me.email}</p>
          <p className="mt-1">
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs ${me.pro ? 'border border-amber-200 bg-amber-50 font-medium text-amber-700' : 'border border-black/5 bg-page text-ink-2'}`}
            >
              {me.pro
                ? `👑 会员有效期至 ${me.plan_expires_at ? me.plan_expires_at.slice(0, 10) : ''}`
                : '免费版 · 每天 1 份试卷 + 1 份 5 题快练'}
            </span>
          </p>
          {!me.pro && me.quota ? (
            <p className="mt-1 text-xs text-ink-3 font-num">
              今日额度：模拟卷剩 {me.quota.paper_left} 份 · 快练剩 {me.quota.quick_left} 份，每天刷新
            </p>
          ) : null}
        </div>
      </Card>

      <Card className="grid grid-cols-3 p-2 text-center text-sm">
        <button onClick={() => nav('history')} className="btn-press rounded-xl py-3 hover:bg-page">
          <span className="block text-xl">📊</span>
          <span className="mt-1 block text-xs font-medium text-ink-2">学习统计</span>
        </button>
        <button onClick={() => nav('wrong')} className="btn-press rounded-xl py-3 hover:bg-page">
          <span className="block text-xl">📕</span>
          <span className="mt-1 block text-xs font-medium text-ink-2">错题本</span>
        </button>
        <button onClick={() => nav('realsubjlist')} className="btn-press rounded-xl py-3 hover:bg-page">
          <span className="block text-xl">📖</span>
          <span className="mt-1 block text-xs font-medium text-ink-2">分析题背诵</span>
        </button>
      </Card>

      <section className="rounded-2xl border border-black/5 bg-gradient-to-r from-brand-500 to-brand-600 p-5 text-white shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-bold">邀请研友，双方各得 3 天会员</p>
            <p className="mt-1 text-xs text-white/80">
              每邀请 1 位注册即生效，奖励上限 10 位 · 已邀请 <b className="font-num">{me.invited_count || 0}</b>/10 ·
              你的邀请码：<b>{me.invite_code || ''}</b>
            </p>
          </div>
          <span className="text-2xl">🎁</span>
        </div>
        <div className="mt-3 flex gap-2">
          <input
            readOnly
            value={`https://zhenti.zalize.com/app2/#reg-${me.invite_code || ''}`}
            className="h-11 min-w-0 flex-1 rounded-xl border border-white/30 bg-white/25 px-3.5 text-xs font-medium text-white outline-none"
          />
          <button onClick={copyInvite} className="btn-press h-11 shrink-0 rounded-xl bg-white px-5 text-sm font-semibold text-brand-600">
            复制链接
          </button>
        </div>
      </section>

      <Card className="p-5">
        <h2 className="font-bold">升级会员</h2>
        {!me.pay_enabled ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            内测期间全部功能免费，在线支付暂未开放。使用下方兑换码即可开通会员权益。
          </div>
        ) : null}
        <div className="mt-3 flex gap-2">
          <Input placeholder="输入兑换码" value={code} onChange={(e) => setCode(e.target.value)} className="h-11 flex-1 min-w-0" />
          <Button className="h-11 shrink-0 px-6" onClick={redeem}>
            兑换
          </Button>
        </div>
        <p className="mt-2.5 text-xs text-ink-3">会员权益：不限量出卷 · 错题导出 Anki .apkg · 更多题型陆续开放</p>
      </Card>

      <Card className="flex items-center gap-3 p-5 text-sm">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold">每日学习提醒</h2>
          <p className="mt-1 text-xs text-ink-3">每天 8:00 发邮件提醒：到期错题数 + 每日一题；当天已打卡则不打扰</p>
        </div>
        <button
          role="switch"
          aria-checked={!!remind}
          disabled={remind === null}
          onClick={toggleRemind}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${remind ? 'bg-brand-500' : 'bg-black/15'}`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${remind ? 'left-[22px]' : 'left-0.5'}`}
          />
        </button>
      </Card>

      <Card className="p-5 text-sm">
        <h2 className="text-base font-bold">修改密码</h2>
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="text-xs text-ink-3">当前密码</span>
            <Input type="password" autoComplete="current-password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} className="mt-1 h-11" />
          </label>
          <label className="block">
            <span className="text-xs text-ink-3">新密码（至少 6 位）</span>
            <Input type="password" autoComplete="new-password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="mt-1 h-11" />
          </label>
          <label className="block">
            <span className="text-xs text-ink-3">再次输入新密码</span>
            <Input type="password" autoComplete="new-password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} className="mt-1 h-11" />
          </label>
          <Button disabled={busy} onClick={changePw}>
            {busy ? '提交中…' : '修改密码'}
          </Button>
        </div>
      </Card>

      <button onClick={logout} className="btn-press h-12 w-full rounded-2xl border border-black/5 bg-white text-sm font-medium text-rose-500 shadow-card hover:bg-rose-50">
        退出登录
      </button>

      <p className="text-center text-xs text-ink-3">
        用不惯新版？
        <a href="/app" className="inline-flex min-h-[32px] items-center px-1 text-ink-2 underline underline-offset-2 hover:text-brand-600">
          返回旧版客户端
        </a>
        （数据完全互通）
      </p>
    </div>
  )
}
