import { useEffect, useState, type ReactNode } from 'react'
import {
  LayoutDashboard,
  BookOpenCheck,
  BookX,
  GraduationCap,
  BarChart3,
  User,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { nav } from '@/lib/router'
import { useApp } from '@/lib/store'

const NAV = [
  { key: 'home', label: '工作台', icon: LayoutDashboard, hash: 'home' },
  { key: 'real', label: '真题库', icon: BookOpenCheck, hash: 'real' },
  { key: 'history', label: '成绩报告', icon: BarChart3, hash: 'history' },
  { key: 'wrong', label: '错题本', icon: BookX, hash: 'wrong' },
  { key: 'subj', label: '分析题背诵', icon: GraduationCap, hash: 'realsubjlist' },
  { key: 'account', label: '我的', icon: User, hash: 'account' },
]

const TABS = [
  { key: 'home', label: '工作台', icon: LayoutDashboard, hash: 'home' },
  { key: 'real', label: '真题', icon: BookOpenCheck, hash: 'real' },
  { key: 'rand', label: '快刷', icon: Zap, hash: 'realrand' },
  { key: 'wrong', label: '错题本', icon: BookX, hash: 'wrong' },
  { key: 'account', label: '我的', icon: User, hash: 'account' },
]

export function activeKey(hash: string): string {
  const h = hash || 'home'
  if (h === 'home') return 'home'
  if (h.startsWith('realsubj')) return 'subj'
  if (h.startsWith('real')) return 'real'
  if (h === 'history') return 'history'
  if (h === 'wrong' || h === 'practice') return 'wrong'
  if (h === 'account') return 'account'
  return ''
}

/** 新版本检测：对比线上 index.html 的 bundle 名与当前已加载的，不一致时提示刷新 */
function useUpdateAvailable(): boolean {
  const [stale, setStale] = useState(false)
  useEffect(() => {
    const cur = [...document.scripts].map((s) => s.src).find((s) => s.includes('/app2/assets/index-'))
    if (!cur) return
    let stop = false
    const check = async () => {
      try {
        const html = await (await fetch('/app2/index.html', { cache: 'no-store' })).text()
        const m = html.match(/assets\/index-[\w-]+\.js/)
        if (!stop && m && !cur.includes(m[0])) setStale(true)
      } catch {
        /* best-effort */
      }
    }
    const onVis = () => document.visibilityState === 'visible' && check()
    const timer = setInterval(check, 30 * 60 * 1000)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stop = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])
  return stale
}

export function Layout({
  children,
  rail,
  active,
}: {
  children: ReactNode
  rail?: ReactNode
  active: string
}) {
  const { me } = useApp()
  const updateReady = useUpdateAvailable()
  return (
    <div className="lg:grid lg:grid-cols-[232px_1fr] min-h-screen">
      {updateReady ? (
        <button
          onClick={() => location.reload()}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 whitespace-nowrap rounded-full bg-brand-500 px-4 py-2.5 text-xs sm:text-sm font-medium text-white shadow-lg"
        >
          新版本已发布 · 点此刷新 ↻
        </button>
      ) : null}
      {/* 桌面左导航 */}
      <aside className="hidden lg:flex flex-col sticky top-0 h-screen border-r border-black/5 bg-white px-4 py-6">
        <button onClick={() => nav('home')} className="flex items-center gap-2.5 px-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-white text-lg font-bold">
            真
          </span>
          <span className="text-lg font-extrabold">真题工坊</span>
        </button>
        <nav className="mt-8 space-y-1">
          {NAV.map((n) => (
            <button
              key={n.key}
              onClick={() => nav(n.hash)}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                active === n.key
                  ? 'bg-brand-50 text-brand-600'
                  : 'text-ink-2 hover:bg-page hover:text-ink'
              )}
            >
              <n.icon className="h-4.5 w-4.5" size={18} />
              {n.label}
            </button>
          ))}
        </nav>
        <button
          onClick={() => nav('realrand')}
          className="btn-press mt-6 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 px-3.5 py-3 text-sm font-semibold text-white"
        >
          <Zap size={16} /> 真题快刷 20 题
        </button>
        <div className="mt-auto px-2 text-xs text-ink-3">
          {me ? (
            <p className="truncate">
              {me.email}
              {me.pro ? ' · 👑 会员' : ''}
            </p>
          ) : null}
        </div>
      </aside>
      {/* 主区 + 右栏 */}
      <div className="min-w-0">
        <div
          className={cn(
            'mx-auto w-full px-4 pb-24 lg:px-8 lg:py-8 lg:pb-10',
            rail ? 'max-w-6xl xl:grid xl:grid-cols-[1fr_300px] xl:gap-6 xl:items-start' : 'max-w-3xl'
          )}
        >
          <main className="min-w-0 fade-in">{children}</main>
          {rail ? <aside className="hidden xl:block space-y-4 sticky top-8">{rail}</aside> : null}
        </div>
      </div>
      {/* 移动端 tabBar */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-black/5 grid grid-cols-5"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {TABS.map((t) =>
          t.key === 'rand' ? (
            <button key={t.key} onClick={() => nav(t.hash)} className="relative -mt-4 grid place-items-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg">
                <t.icon size={20} />
              </span>
              <span className="mt-0.5 text-[11px] text-ink-2">{t.label}</span>
            </button>
          ) : (
            <button
              key={t.key}
              onClick={() => nav(t.hash)}
              className={cn(
                'flex flex-col items-center gap-0.5 py-2 text-[11px]',
                active === t.key ? 'text-brand-600 font-medium' : 'text-ink-2'
              )}
            >
              <t.icon size={20} />
              {t.label}
            </button>
          )
        )}
      </nav>
    </div>
  )
}
