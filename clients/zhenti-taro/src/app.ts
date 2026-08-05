import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import { setupNativeShell } from './native'

import '@nutui/nutui-react-taro/dist/style.css'
import './app.scss'

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    setupNativeShell()
  })

  // children 是将要会渲染的页面
  return children
}

export default App
