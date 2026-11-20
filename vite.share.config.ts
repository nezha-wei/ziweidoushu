import { defineConfig } from 'vite';
import base from './vite.config';

// 离线分享包专用构建：单 chunk（inlineDynamicImports），便于把 JS/CSS 全部内联进 index.html，
// 使产物双击即玩（file:// 下内联 module 脚本不触发跨域 fetch）。
export default defineConfig({
  ...base,
  build: {
    ...base.build,
    outDir: 'dist-share',
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: 'app.js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});