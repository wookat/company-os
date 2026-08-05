import Taro from '@tarojs/taro'

// Capacitor 装壳（Android/iOS）原生适配：仅 H5 产物且运行在原生壳内时生效
export function setupNativeShell() {
  if (process.env.TARO_ENV !== 'h5') return
  const cap = (window as any).Capacitor
  if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return

  // 状态栏品牌蓝 + 白字
  import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
    StatusBar.setBackgroundColor({ color: '#3D7FFF' }).catch(() => {})
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {})
  }).catch(() => {})

  // Android 返回键：有历史则页内返回，首页双击退出确认
  import('@capacitor/app').then(({ App: CapApp }) => {
    CapApp.addListener('backButton', ({ canGoBack }) => {
      const pages = Taro.getCurrentPages()
      if (pages.length > 1) {
        Taro.navigateBack()
      } else if (canGoBack && !/pages\/(home|login)\/index/.test(window.location.hash)) {
        window.history.back()
      } else {
        Taro.showModal({ title: '退出应用', content: '确定退出真题工坊？' }).then(r => {
          if (r.confirm) CapApp.exitApp()
        })
      }
    })
  }).catch(() => {})
}
