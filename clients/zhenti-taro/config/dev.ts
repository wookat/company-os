import type { UserConfigExport } from "@tarojs/cli"

export default {
   logger: {
    quiet: false,
    stats: true
  },
  mini: {},
  h5: {
    devServer: {
      // 线上 Worker 未开 CORS，H5 开发/演示走同源代理
      proxy: [
        {
          context: ['/api'],
          target: 'https://zhenti.zalize.com',
          changeOrigin: true,
          secure: true
        }
      ]
    }
  }
} satisfies UserConfigExport<'webpack5'>
