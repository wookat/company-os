import Taro from '@tarojs/taro'

// 是否运行在 Capacitor 原生壳内（Android/iOS APP）
export function isNativeShell(): boolean {
  if (process.env.TARO_ENV !== 'h5') return false
  const cap = (window as any).Capacitor
  return !!(cap && cap.isNativePlatform && cap.isNativePlatform())
}

// Capacitor 装壳（Android/iOS）原生适配：仅 H5 产物且运行在原生壳内时生效
export function setupNativeShell() {
  if (!isNativeShell()) return

  // 状态栏品牌蓝 + 白字
  import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
    StatusBar.setBackgroundColor({ color: '#3D7FFF' }).catch(() => {})
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {})
  }).catch(() => {})

  // Android 返回键：有历史则页内返回，首页双击退出确认
  import('@capacitor/app').then(({ App: CapApp }) => {
    CapApp.addListener('backButton', async ({ canGoBack }) => {
      // 页面级离开确认（如答题中），确认后再继续返回
      const guard = (window as any).__ztLeaveGuard as (() => Promise<boolean>) | undefined
      if (guard && !(await guard())) return
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

// 装壳环境：分享图写入系统相册（@capacitor-community/media，App 专属相册无需存储权限）
export async function saveImageToAlbum(dataUrl: string, fileName: string): Promise<void> {
  const { Media } = await import('@capacitor-community/media')
  const albumName = '真题工坊'
  let identifier: string | undefined
  const find = async () => {
    const { albums } = await Media.getAlbums()
    return albums.find(a => a.name === albumName)?.identifier
  }
  identifier = await find()
  if (!identifier) {
    await Media.createAlbum({ name: albumName })
    identifier = await find()
  }
  await Media.savePhoto({ path: dataUrl, albumIdentifier: identifier, fileName: fileName.replace(/\.png$/, '') })
}
