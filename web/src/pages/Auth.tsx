import { useState } from 'react'
import { api, ApiError, setToken } from '@/lib/api'
import { useApp } from '@/lib/store'
import { safeDec } from '@/lib/router'
import { Button, Card, Input } from '@/components/ui'

function intentHint(): string {
  const h = location.hash.slice(1)
  const sj = h.match(/^realsubj\/(\d{4})-(\d{1,2})$/)
  const sjy = h.match(/^realsubj\/(\d{4})$/)
  if (sj) return `注册后直达 ${sj[1]} 年第 ${sj[2]} 题的参考答案要点`
  if (sjy) return `注册后直达 ${sjy[1]} 年分析题参考要点背诵`
  if (/^realsubj/.test(h)) return '注册后直达历年分析题参考答案要点背诵'
  if (/^realrand/.test(h)) return '注册后直达全库随机 20 题快刷'
  if (/^realyear\/(\d{4})/.test(h)) return `注册后直达 ${h.split('/')[1]} 年真题整卷模考`
  if (/^realsearch\/./.test(h))
    return `注册后直达「${safeDec(h.split('/').slice(1).join('/'))}」考点历年真题练习`
  return ''
}

export function AuthPage() {
  const { loadMe, toast } = useApp()
  const regM = location.hash.match(/^#reg(?:-(Z[0-9A-Za-z]{1,8}))?$/)
  if (regM && regM[1]) {
    try {
      localStorage.setItem('zt_invite', regM[1])
    } catch {
      /* ignore */
    }
  }
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(
    regM || /^#real/.test(location.hash) ? 'register' : 'login'
  )
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const hint = mode === 'register' ? intentHint() : ''

  const submit = async () => {
    if (busy) return
    setBusy(true)
    try {
      if (mode === 'forgot') {
        await api('/forgot', { method: 'POST', body: JSON.stringify({ email }) })
        toast('如该邮箱已注册，重置链接已发送，请查收', true)
        setMode('login')
        return
      }
      const payload: Record<string, string> = { email, password: pw }
      if (mode === 'register') {
        const inv = localStorage.getItem('zt_invite')
        if (inv) payload.invite = inv
      }
      const d = await api<{ token: string }>('/' + mode, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      if (!d || !d.token) throw new Error('服务响应异常，请重试')
      setToken(d.token)
      await loadMe()
      if (!/^#real/.test(location.hash)) location.hash = 'home'
    } catch (e) {
      if (e instanceof ApiError && e.status === 0 && mode === 'register') {
        toast('网络较慢，注册请求可能已在服务端完成——请稍后用该邮箱密码直接登录，若提示不存在再重新注册')
      } else {
        toast((e as Error).message || '请求失败，请重试')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-page grid place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-500 text-white text-xl font-bold">
            真
          </span>
          <span className="text-2xl font-extrabold">真题工坊</span>
        </div>
        <p className="mt-2 text-center text-sm text-ink-2">考研政治真题刷题 · AI 定向补练</p>
        <Card className="mt-6 p-6">
          <h1 className="text-lg font-bold">
            {mode === 'login' ? '登录' : mode === 'register' ? '注册新账号' : '找回密码'}
          </h1>
          {hint ? <p className="mt-1 text-xs text-brand-600">{hint}（免费）</p> : null}
          <div className="mt-4 space-y-3">
            <Input
              type="email"
              placeholder="邮箱"
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
            />
            {mode !== 'forgot' ? (
              <Input
                type="password"
                placeholder="密码（至少 6 位）"
                value={pw}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                onChange={(e) => setPw(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
            ) : null}
            <Button size="lg" className="w-full" disabled={busy} onClick={submit}>
              {busy
                ? '请稍候…'
                : mode === 'login'
                  ? '登录'
                  : mode === 'register'
                    ? '注册并开始刷题'
                    : '发送重置链接'}
            </Button>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-ink-2">
            {mode === 'login' ? (
              <>
                <button className="hover:text-brand-600" onClick={() => setMode('register')}>
                  没有账号？注册
                </button>
                <button className="hover:text-brand-600" onClick={() => setMode('forgot')}>
                  忘记密码
                </button>
              </>
            ) : (
              <button className="hover:text-brand-600" onClick={() => setMode('login')}>
                已有账号？登录
              </button>
            )}
          </div>
        </Card>
        <p className="mt-4 text-center text-xs text-ink-3">
          历年真题免费不限量 · 错题间隔重复 · 分析题要点背诵
        </p>
        <p className="mt-2 text-center text-xs text-ink-3">
          注册即代表同意
          <a href="/terms" target="_blank" rel="noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-brand-600">服务条款</a>
          与
          <a href="/privacy" target="_blank" rel="noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-brand-600">隐私政策</a>
        </p>
      </div>
    </div>
  )
}

export function ResetPage({ token }: { token: string }) {
  const { toast } = useApp()
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    if (pw.length < 6) return toast('新密码至少 6 位')
    setBusy(true)
    try {
      await api('/reset', { method: 'POST', body: JSON.stringify({ token, password: pw }) })
      toast('密码已重置，请用新密码登录', true)
      location.hash = ''
    } catch (e) {
      toast((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="min-h-screen bg-page grid place-items-center px-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-lg font-bold">重置密码</h1>
        <div className="mt-4 space-y-3">
          <Input
            type="password"
            placeholder="新密码（至少 6 位）"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <Button size="lg" className="w-full" disabled={busy} onClick={submit}>
            重置密码
          </Button>
        </div>
      </Card>
    </div>
  )
}
