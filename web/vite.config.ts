import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  base: '/app2/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: '../public/app2',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://zhenti.zalize.com',
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: 'https://zhenti.zalize.com',
        changeOrigin: true,
      },
    },
  },
})
