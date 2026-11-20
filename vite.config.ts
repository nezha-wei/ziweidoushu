import { defineConfig } from 'vite';

// 纯静态产物，base 用相对路径以适配 Qoder Sites 任意子路径托管。
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2019',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
      vendor: ['iztro', 'lunar-javascript'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});