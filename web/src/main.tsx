import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AppProvider } from './lib/store'

// 获客归因：从公开真题库页（/zhenti*）跳转而来的访客，注册时标记 reg_src=seo
try {
  const ref = document.referrer
  if (
    new URLSearchParams(location.search).get('src') === 'seo' ||
    (ref && new URL(ref).hostname === location.hostname && new URL(ref).pathname.startsWith('/zhenti'))
  )
    localStorage.setItem('zt_src', 'seo')
} catch {
  /* ignore */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>
)
