/**
 * 离线分享包打包：单 chunk 构建 → JS/CSS 内联进 index.html → 拷贝海报 → 生成双击即玩目录。
 * 运行：node scripts/pack-share.mjs （产物：release/紫微斗数-离线体验包/）
 * 原理：file:// 下外链 module 脚本会被 CORS 拦截，但内联 module 脚本不发起 fetch，
 * 故把唯一 chunk 与 CSS 全部内联；海报为 <img> 相对路径，file:// 下正常加载。
 */
import { build } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('.');
const OUT = path.join(ROOT, 'release', '紫微斗数-离线体验包');

await build({ configFile: path.join(ROOT, 'vite.share.config.ts'), logLevel: 'warn' });

const dist = path.join(ROOT, 'dist-share');
let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

// 内联唯一 JS chunk（转义可能提前闭合 script 的序列）
const js = fs.readFileSync(path.join(dist, 'app.js'), 'utf8')
  .replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
html = html.replace(/<script type="module"[^>]*src="\.\/app\.js"[^>]*><\/script>/, () => `<script type="module">${js}</script>`);

// 内联 CSS
const cssFile = fs.readdirSync(path.join(dist, 'assets')).find((f) => f.endsWith('.css'));
if (cssFile) {
  const css = fs.readFileSync(path.join(dist, 'assets', cssFile), 'utf8').replace(/<\/style/gi, '<\\/style');
  html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/assets\/[^"]+"[^>]*>/, () => `<style>${css}</style>`);
}
// 去掉 modulepreload / 外链残留
html = html.replace(/<link rel="modulepreload"[^>]*>/g, '');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), html);
fs.cpSync(path.join(dist, 'posters'), path.join(OUT, 'posters'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'LICENSE'), path.join(OUT, 'LICENSE'));

fs.writeFileSync(path.join(OUT, '使用说明.txt'), `紫微斗数 · 离线体验包
================================

【怎么玩】
解压后双击 index.html 即可（推荐 Edge / Chrome）。
无需安装任何软件、无需联网、无需启动服务：排盘引擎与全部解读都在浏览器本地运行。
若个别浏览器限制 file:// 页面，可在本目录改用任一本地静态服务打开：
  python -m http.server 8000   然后访问 http://localhost:8000
  或 npx serve .

【包里有什么】
index.html   全部 HTML/CSS/JS 内联的单文件应用
posters/     六张原创奶金国风工笔插画（首页海报廊）
LICENSE      MIT 许可与署名边界
使用说明.txt 本文件

【功能一览】
起盘表单（公历/农历、真太阳时/夏令时校正、进阶口径）→ 可拖拽旋转的星象罗盘
（拖拽与点击宫位/星曜互不干扰）→ 传统方盘 → 宫位/星曜解读抽屉、宫干飞四化、
三方四正跳转 → 格局面板 → 大限流年推演与播放 → 五维指标与星卡 PNG 导出、
判词复制 → 罗盘控制台实时调节 → 音效开关 → 关于与古籍书院。
命盘历史保存在本机浏览器 localStorage，不上传任何生辰数据。

【源码与二次开发】
另附「紫微斗数-源码包.zip」：解压后 npm install、npm run dev 即可开发，
npm run build 产出可托管静态站（base './'，适配任意子路径）。
排盘内核 iztro（MIT）+ lunar-javascript（MIT），界面与解读文本为原创。

—— 紫微斗数 · 2026 Qoder 高校创造力大赛 LifeHack 赛道原创作品
`);

const size = (fs.statSync(path.join(OUT, 'index.html')).size / 1024).toFixed(0);
console.log(`离线体验包已生成：${OUT}（index.html ${size} kB + posters 6 张）`);