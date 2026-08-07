import { PropsWithChildren } from 'react'
import Taro, { useLaunch } from '@tarojs/taro'
import '@nutui/nutui-react-taro/dist/style.css'

import { setupNativeShell } from './native'
import { initTheme } from './theme'
import { getToken } from './api'

import './app.scss'

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    initTheme()
    setupNativeShell()
    // 无 token 启动直接进登录页，避免先渲染空数据工作台
    if (process.env.TARO_ENV === 'h5' && !getToken() && !window.location.hash.includes('pages/login')) {
      Taro.redirectTo({ url: '/pages/login/index' })
    }
  })

  // children 是将要会渲染的页面
  return children
}

export default App
