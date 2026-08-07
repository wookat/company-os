import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { api, setToken, getToken } from './api'
import type { Me } from './types'

interface MeResp {
  user: Me
  pro: boolean
  quota: Me['quota']
  invite_code?: string
  invited_count?: number
  pay_enabled?: boolean
}

interface Toast {
  id: number
  msg: string
  ok?: boolean
  action?: { label: string; hash: string }
}

interface ConfirmReq {
  msg: string
  okText: string
  cancelText: string
  soft?: boolean
  resolve: (v: boolean) => void
}

interface AppState {
  me: Me | null
  setMe: (m: Me | null) => void
  loadMe: () => Promise<Me | null>
  logout: () => void
  toast: (msg: string, ok?: boolean, action?: { label: string; hash: string }) => void
  toasts: Toast[]
  confirm: (msg: string, okText?: string, cancelText?: string, soft?: boolean) => Promise<boolean>
  confirmReq: ConfirmReq | null
}

const Ctx = createContext<AppState>(null as unknown as AppState)

export function AppProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmReq, setConfirmReq] = useState<ConfirmReq | null>(null)
  const idRef = useRef(0)

  const toast = useCallback((msg: string, ok?: boolean, action?: { label: string; hash: string }) => {
    const id = ++idRef.current
    setToasts((t) => [...t, { id, msg, ok, action }])
    const ms = Math.min(8000, Math.max(3000, msg.length * 160 + (action ? 2000 : 0)))
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms)
  }, [])

  const loadMe = useCallback(async (): Promise<Me | null> => {
    if (!getToken()) return null
    try {
      const d = await api<MeResp>('/me')
      const m: Me = {
        ...d.user,
        pro: d.pro,
        quota: d.quota,
        invite_code: d.invite_code,
        invited_count: d.invited_count,
        pay_enabled: d.pay_enabled,
      }
      setMe(m)
      return m
    } catch {
      setToken('')
      setMe(null)
      return null
    }
  }, [])

  const logout = useCallback(() => {
    setToken('')
    setMe(null)
    location.hash = ''
  }, [])

  const confirm = useCallback((msg: string, okText = '确定', cancelText = '取消', soft?: boolean) => {
    return new Promise<boolean>((resolve) => {
      setConfirmReq({
        msg,
        okText,
        cancelText,
        soft,
        resolve: (v) => {
          setConfirmReq(null)
          resolve(v)
        },
      })
    })
  }, [])

  return (
    <Ctx.Provider value={{ me, setMe, loadMe, logout, toast, toasts, confirm, confirmReq }}>
      {children}
    </Ctx.Provider>
  )
}

export function useApp() {
  return useContext(Ctx)
}
