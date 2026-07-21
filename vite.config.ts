import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// 前端构建到 ./dist，供 wrangler 作为静态资源托管
export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    // 本地开发时把 /api 代理到 wrangler dev（默认 8787）
    proxy: {
      '/api': 'http://127.0.0.1:8788',
    },
  },
})
