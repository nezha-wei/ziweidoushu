/**
 * 离线体验包实测：file:// 双击即玩场景，双视口主流程 + 资源加载 + 控制台 + 溢出。
 * 运行：node scripts/verify-offline.mjs （需先 node scripts/pack-share.mjs）
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PACK = path.resolve('release', '紫微斗数-离线体验包', 'index.html');
const URL = pathToFileURL(PACK).href;
const SHOTS = path.resolve('shots');
const DL = path.join(SHOTS, 'downloads-offline');
fs.mkdirSync(DL, { recursive: true });

const results = [];
const errors = [];
const badNet = [];
function ok(name, cond, extra = '') {
  results.push(`${cond ? 'PASS' : 'FAIL'} | ${name}${extra ? ' | ' + extra : ''}`);
  if (!cond) process.exitCode = 1;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(browser, width, height, mobile) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[console ${width}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[pageerror ${width}] ${e.message}`));
  page.on('requestfailed', (r) => badNet.push(`[failed ${width}] ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) badNet.push(`[http ${r.status()} ${width}] ${r.url()}`); });
  const cdp = await page.target().createCDPSession();
  await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DL });
  return page;
}
const rotorAngle = (page) => page.evaluate(() => {
  const m = /rotate\(([-\d.]+)/.exec(document.querySelector('.compass-rotor')?.getAttribute('transform') || '');
  return m ? parseFloat(m[1]) : 0;
});
async function sectorPoint(page, i) {
  await page.evaluate(() => document.querySelector('.compass-wrap').scrollIntoView({ behavior: 'instant', block: 'center' }));
  await sleep(300);
  return page.evaluate((idx) => {
    const svg = document.querySelector('.compass-svg');
    const r = svg.getBoundingClientRect();
    const m = /rotate\(([-\d.]+)/.exec(document.querySelector('.compass-rotor').getAttribute('transform') || '');
    const rot = m ? parseFloat(m[1]) : 0;
    const base = idx * 30 - 75;
    for (const rad of [374, 380, 368, 430, 445, 322, 232]) {
      for (const da of [0, 5, -5, 9, -9]) {
        const a = ((base + da + rot) * Math.PI) / 180;
        const p = { x: r.left + ((500 + rad * Math.cos(a)) / 1000) * r.width, y: r.top + ((500 + rad * Math.sin(a)) / 1000) * r.height };
        if (p.y < 0 || p.y > innerHeight) continue;
        const el = document.elementFromPoint(p.x, p.y);
        if (el && el.classList && el.classList.contains('sector')) return p;
      }
    }
    return null;
  }, i);
}
const drawerOpen = (page) => page.$eval('.drawer-root', (e) => e.classList.contains('open'));
const clickTab = (page, t) => page.evaluate((x) => { [...document.querySelectorAll('.tab-item')].find((b) => b.textContent === x)?.click(); }, t);

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });

for (const [width, height, mobile, tag] of [[1440, 900, false, '桌面'], [390, 844, true, '移动']]) {
  const page = await newPage(browser, width, height, mobile);
  await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
  await sleep(1000);
  ok(`${tag}·file:// 首屏渲染`, await page.$eval('.hero-title-cn', (e) => e.textContent.trim() === '紫微斗数'));
  await page.evaluate(() => document.querySelector('.hero-gallery').scrollIntoView({ behavior: 'instant', block: 'center' }));
  await sleep(1500);
  ok(`${tag}·六张海报本地加载`, await page.evaluate(() => [...document.querySelectorAll('.poster-card img')].every((i) => i.complete && i.naturalWidth > 0)));
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await sleep(400);
  await page.screenshot({ path: path.join(SHOTS, `off-${tag === '桌面' ? 'd' : 'm'}1-hero.png`) });

  await page.evaluate(() => document.querySelector('.poster-card[href="#cast"]').click());
  await sleep(800);
  await page.click('.cast-submit');
  await page.waitForSelector('.compass-svg .sector', { timeout: 15000 });
  await sleep(1000);
  ok(`${tag}·离线起盘排盘成功`, await page.$('.compass-svg .sector') !== null);

  const a0 = await rotorAngle(page);
  const box = await page.$eval('.compass-svg', (e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const sx = box.x + box.w / 2 + box.w * 0.35, sy = box.y + box.h / 2;
  await page.mouse.move(sx, sy); await page.mouse.down();
  for (let i = 1; i <= 6; i++) { await page.mouse.move(sx + i * 4, sy + i * 13); await sleep(40); }
  await page.mouse.up();
  ok(`${tag}·拖拽旋转`, Math.abs((await rotorAngle(page)) - a0) > 5);

  const pt = await sectorPoint(page, 0);
  if (pt) { await page.mouse.click(pt.x, pt.y); await sleep(500); }
  ok(`${tag}·点击宫位开抽屉`, await drawerOpen(page));
  const t1 = await page.$eval('.drawer-title', (e) => e.textContent);
  await page.evaluate(() => { const g = document.querySelectorAll('.drawer-chips'); g[g.length - 1]?.querySelectorAll('button')[1]?.click(); });
  await sleep(400);
  ok(`${tag}·三方四正跳转`, (await page.$eval('.drawer-title', (e) => e.textContent)) !== t1);
  await page.keyboard.press('Escape'); await sleep(300);

  await clickTab(page, '传统方盘'); await sleep(500);
  const bf = await page.evaluate(() => ({
    cells: document.querySelectorAll('.board-cell').length,
    sw: document.querySelector('.board-grid').scrollWidth,
    cw: document.querySelector('.board-wrap').clientWidth,
  }));
  ok(`${tag}·方盘完整无裁切`, bf.cells === 12 && bf.sw <= bf.cw + 1, JSON.stringify(bf));
  await page.screenshot({ path: path.join(SHOTS, `off-${tag === '桌面' ? 'd' : 'm'}2-board.png`) });
  await clickTab(page, '星象罗盘'); await sleep(300);

  await page.evaluate(() => document.getElementById('timeline').scrollIntoView({ behavior: 'instant', block: 'center' }));
  await sleep(400);
  const p0 = await page.$eval('.tl-progress', (e) => e.textContent);
  await page.click('.tl-play'); await sleep(4600);
  const p1 = await page.$eval('.tl-progress', (e) => e.textContent);
  await page.click('.tl-play'); await sleep(200);
  ok(`${tag}·大限播放推演`, p0 !== p1, `${p0}→${p1}`);

  await page.evaluate(() => document.getElementById('share').scrollIntoView({ behavior: 'instant', block: 'center' }));
  await sleep(600);
  const blobSize = await page.evaluate(() => new Promise((res) => document.querySelector('.share-canvas').toBlob((b) => res(b ? b.size : 0), 'image/png')));
  ok(`${tag}·星卡 Canvas 可导出像素`, blobSize > 50000, `${blobSize} bytes`);
  const t0 = Date.now();
  await page.click('.share-actions .btn-primary');
  let dl = false;
  for (let i = 0; i < 16; i++) { await sleep(500); if (fs.readdirSync(DL).some((f) => f.endsWith('.png') && fs.statSync(path.join(DL, f)).mtimeMs > t0)) { dl = true; break; } }
  ok(`${tag}·PNG 下载落盘(file://)`, dl, await page.$eval('.share-status', (e) => e.textContent));
  await page.screenshot({ path: path.join(SHOTS, `off-${tag === '桌面' ? 'd' : 'm'}3-share.png`) });

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await sleep(300);
  await page.click('.sound-toggle'); await sleep(150);
  const m1 = await page.$eval('.sound-toggle', (e) => e.classList.contains('muted'));
  await page.click('.sound-toggle'); await sleep(150);
  ok(`${tag}·音效开关`, m1 !== (await page.$eval('.sound-toggle', (e) => e.classList.contains('muted'))));
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  ok(`${tag}·零横向溢出`, ov <= 0, `差值${ov}px`);
  await page.close();
}

await browser.close();
const realErrors = errors.filter((e) => !e.includes('favicon'));
ok('控制台零错误', realErrors.length === 0, realErrors.slice(0, 6).join(' || '));
ok('资源零失败/零404', badNet.length === 0, badNet.slice(0, 6).join(' || '));
console.log('\n========== 离线包实测结果 ==========');
for (const r of results) console.log(r);
console.log(realErrors.length ? `\n控制台错误：\n${realErrors.join('\n')}` : '\n控制台错误：无');
console.log(badNet.length ? `\n资源失败：\n${badNet.join('\n')}` : '\n资源失败：无');