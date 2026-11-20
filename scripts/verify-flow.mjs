/**
 * 主流程人工式实测（puppeteer-core 驱动本机 Edge 无头，rAF/截图/下载均真实生效）。
 * 桌面 1440×900 与移动 390×844：海报廊入口→起盘→拖拽旋转→宫位/星曜抽屉→三方四正跳转
 * →方盘往返→左竖轨高亮→全屏菜单→大限播放→星卡 PNG 导出→音效开关→溢出/控制台。
 * 运行：node scripts/verify-flow.mjs （需先 npm run build 并启动 npm run preview）
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = 'http://localhost:4173/';
const SHOTS = path.resolve('shots');
const DL = path.resolve('shots', 'downloads');
fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(DL, { recursive: true });

const results = [];
const errors = [];
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
  const cdp = await page.target().createCDPSession();
  await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DL });
  return page;
}
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
const rotorAngle = (page) => page.evaluate(() => {
  const m = /rotate\(([-\d.]+)/.exec(document.querySelector('.compass-rotor')?.getAttribute('transform') || '');
  return m ? parseFloat(m[1]) : 0;
});
async function waitChart(page) {
  await page.waitForSelector('.compass-svg .sector', { timeout: 15000 });
  await sleep(1000);
}
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
const drawerTitle = (page) => page.$eval('.drawer-title', (e) => e.textContent.trim());
const drawerOpen = (page) => page.$eval('.drawer-root', (e) => e.classList.contains('open'));
const clickTab = (page, text) => page.evaluate((t) => {
  [...document.querySelectorAll('.tab-item')].find((b) => b.textContent === t)?.click();
}, text);

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });

/* ================= 桌面 1440×900 ================= */
{
  const page = await newPage(browser, 1440, 900, false);
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(800);
  await page.evaluate(() => document.querySelector('.hero-gallery').scrollIntoView({ behavior: 'instant', block: 'center' }));
  await sleep(1800);
  const hero = await page.evaluate(() => ({
    title: document.querySelector('.hero-title-cn')?.textContent.trim(),
    posters: document.querySelectorAll('.poster-card').length,
    imgs: [...document.querySelectorAll('.poster-card img')].every((i) => i.complete && i.naturalWidth > 0),
  }));
  ok('D1 首屏刊头+海报廊六卡插画加载', hero.title === '紫微斗数' && hero.posters === 6 && hero.imgs, JSON.stringify(hero));
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await sleep(500);
  await shot(page, 'vd1-hero');

  await page.evaluate(() => document.querySelector('.poster-card[href="#cast"]').click());
  await sleep(900);
  const castTop = await page.$eval('#cast', (e) => e.getBoundingClientRect().top);
  ok('D2 海报入口卡跳转起盘区', castTop > 40 && castTop < 200, `top=${Math.round(castTop)}`);

  await page.click('.cast-submit');
  await waitChart(page);
  ok('D3 提交起盘罗盘渲染', await page.$('.compass-svg .sector') !== null);
  await shot(page, 'vd2-chart');

  const a0 = await rotorAngle(page);
  const box = await page.$eval('.compass-svg', (e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const sx = box.x + box.w / 2 + box.w * 0.35, sy = box.y + box.h / 2;
  await page.mouse.move(sx, sy); await page.mouse.down();
  let dragging = false;
  for (let i = 1; i <= 6; i++) {
    await page.mouse.move(sx + i * 4, sy + i * 13); await sleep(50);
    if (i === 3) dragging = await page.evaluate(() => document.querySelector('.compass-svg').classList.contains('dragging'));
  }
  await page.mouse.up();
  const a1 = await rotorAngle(page);
  ok('D4 拖拽旋转(dragging 类+角度变化>5°)', dragging && Math.abs(a1 - a0) > 5, `${a0.toFixed(1)}°→${a1.toFixed(1)}°`);

  const pt = await sectorPoint(page, 0);
  ok('D5a 扇区命中点存在', !!pt);
  if (pt) { await page.mouse.click(pt.x, pt.y); await sleep(500); }
  const t1 = await drawerTitle(page);
  ok('D5b 点击宫位开抽屉', await drawerOpen(page) && t1.length > 0, t1);
  await shot(page, 'vd3-drawer');

  await page.evaluate(() => {
    const groups = document.querySelectorAll('.drawer-chips');
    groups[groups.length - 1]?.querySelectorAll('button')[1]?.click();
  });
  await sleep(400);
  const t2 = await drawerTitle(page);
  ok('D6a 三方四正跳转', t2 !== t1 && t2.length > 0, `${t1}→${t2}`);
  await page.click('.drawer-star-chip'); await sleep(400);
  const t3 = await drawerTitle(page);
  ok('D6b 星曜 chip 切换解读', t3 !== t2 && t3.length > 0, `${t2}→${t3}`);
  await page.keyboard.press('Escape'); await sleep(400);
  ok('D7 ESC 关抽屉', !(await drawerOpen(page)));

  await clickTab(page, '传统方盘'); await sleep(500);
  const board = await page.evaluate(() => ({
    h: document.querySelector('.board-grid').offsetHeight,
    cells: document.querySelectorAll('.board-cell').length,
    center: !!document.querySelector('.board-center'),
  }));
  ok('D8a 方盘 12 宫+中央 tile', board.h > 0 && board.cells === 12 && board.center, JSON.stringify(board));
  await shot(page, 'vd4-board');
  await page.evaluate(() => document.querySelectorAll('.board-cell')[1].click()); await sleep(400);
  ok('D8b 方盘格开抽屉', await drawerOpen(page));
  await page.keyboard.press('Escape'); await sleep(300);
  await clickTab(page, '星象罗盘'); await sleep(400);
  ok('D8c 切回罗盘方盘隐藏', await page.$eval('.board-wrap', (e) => e.style.display === 'none'));

  await page.evaluate(() => document.getElementById('timeline').scrollIntoView({ behavior: 'instant', block: 'center' }));
  await sleep(500);
  const rail1 = await page.$eval('.rail-link.active', (e) => e.dataset.target);
  await page.evaluate(() => document.getElementById('share').scrollIntoView({ behavior: 'instant', block: 'center' }));
  await sleep(500);
  const rail2 = await page.$eval('.rail-link.active', (e) => e.dataset.target);
  ok('D9 左竖轨 scrollspy 高亮', rail1 === 'timeline' && rail2 === 'share', `${rail1}/${rail2}`);

  await page.click('.menu-btn'); await sleep(500);
  ok('D10a 全屏菜单打开', await page.$eval('.menu-overlay', (e) => e.classList.contains('open')));
  await shot(page, 'vd5-menu');
  await page.keyboard.press('Escape'); await sleep(400);
  ok('D10b ESC 关菜单', await page.$eval('.menu-overlay', (e) => !e.classList.contains('open')));

  await page.evaluate(() => document.getElementById('timeline').scrollIntoView({ behavior: 'instant', block: 'center' }));
  await sleep(400);
  const p0 = await page.$eval('.tl-progress', (e) => e.textContent);
  await page.click('.tl-play'); await sleep(300);
  const playTxt = await page.$eval('.tl-play', (e) => e.textContent);
  await sleep(4200);
  const p1 = await page.$eval('.tl-progress', (e) => e.textContent);
  await page.click('.tl-play'); await sleep(300);
  const stopTxt = await page.$eval('.tl-play', (e) => e.textContent);
  ok('D11 大限播放前进+暂停', playTxt.includes('暂停') && p0 !== p1 && stopTxt.includes('播放'), `${p0}→${p1}`);
  await shot(page, 'vd6-timeline');

  await page.evaluate(() => document.getElementById('share').scrollIntoView({ behavior: 'instant', block: 'center' }));
  await sleep(600);
  const cw = await page.$eval('.share-canvas', (e) => e.width);
  ok('D12a 星卡 canvas 已绘制', cw > 0, `width=${cw}`);
  const before = fs.readdirSync(DL).length;
  await page.click('.share-actions .btn-primary');
  let downloaded = false;
  for (let i = 0; i < 16; i++) { await sleep(500); if (fs.readdirSync(DL).some((f) => f.endsWith('.png') && Date.now() - fs.statSync(path.join(DL, f)).mtimeMs < 20000)) { downloaded = true; break; } }
  const dlStatus = await page.$eval('.share-status', (e) => e.textContent);
  ok('D12b PNG 导出落盘', downloaded || fs.readdirSync(DL).length > before, dlStatus);
  await page.evaluate(() => [...document.querySelectorAll('.share-actions button')].find((b) => b.textContent.includes('复制判词'))?.click());
  await sleep(600);
  const cpStatus = await page.$eval('.share-status', (e) => e.textContent);
  ok('D12c 复制判词反馈', cpStatus.includes('复制'), cpStatus);
  await shot(page, 'vd7-share');

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await sleep(400);
  await page.click('.sound-toggle'); await sleep(200);
  const m1 = await page.$eval('.sound-toggle', (e) => e.classList.contains('muted'));
  await page.click('.sound-toggle'); await sleep(200);
  const m2 = await page.$eval('.sound-toggle', (e) => e.classList.contains('muted'));
  ok('D13 音效开关往返', m1 !== m2, `muted ${m1}→${m2}`);
  const ovD = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  ok('D14 桌面零横向溢出', ovD <= 0, `差值${ovD}px`);
  await page.close();
}

/* ================= 移动 390×844 ================= */
{
  const page = await newPage(browser, 390, 844, true);
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(800);
  const mhero = await page.evaluate(() => ({
    posters: document.querySelectorAll('.poster-card').length,
    lastRight: Math.round([...document.querySelectorAll('.nav-link')].pop().getBoundingClientRect().right),
  }));
  ok('M1 首屏六卡+导航五链接完整入屏', mhero.posters === 6 && mhero.lastRight <= 390, JSON.stringify(mhero));
  await shot(page, 'vm1-hero');

  await page.click('.menu-btn'); await sleep(500);
  ok('M2a 全屏菜单打开', await page.$eval('.menu-overlay', (e) => e.classList.contains('open')));
  await shot(page, 'vm2-menu');
  await page.click('.menu-link[href="#cast"]'); await sleep(900);
  const menuClosed = await page.$eval('.menu-overlay', (e) => !e.classList.contains('open'));
  const castTop = await page.$eval('#cast', (e) => e.getBoundingClientRect().top);
  ok('M2b 菜单链接跳转并关闭', menuClosed && castTop > 40 && castTop < 220, `top=${Math.round(castTop)}`);

  await page.click('.cast-submit');
  await waitChart(page);
  const cw = await page.$eval('.compass-svg', (e) => Math.round(e.getBoundingClientRect().width));
  ok('M3 罗盘适配宽度', cw <= 390, `${cw}px`);
  await shot(page, 'vm3-chart');

  const pt = await sectorPoint(page, 2);
  ok('M4a 移动扇区命中点', !!pt);
  if (pt) { await page.mouse.click(pt.x, pt.y); await sleep(500); }
  const dw = await page.$eval('.drawer', (e) => Math.round(e.getBoundingClientRect().width));
  ok('M4b 抽屉全宽打开', await drawerOpen(page) && dw >= 385, `${dw}px`);
  await shot(page, 'vm4-drawer');
  await page.click('.drawer-close'); await sleep(400);
  ok('M4c 关闭按钮生效', !(await drawerOpen(page)));

  await clickTab(page, '传统方盘'); await sleep(500);
  const bf = await page.evaluate(() => ({
    sw: document.querySelector('.board-grid').scrollWidth,
    cw: document.querySelector('.board-wrap').clientWidth,
    cr: Math.round(document.querySelector('.board-center').getBoundingClientRect().right),
  }));
  ok('M5a 方盘四列完整入屏无裁切', bf.sw <= bf.cw + 1 && bf.cr <= 390, JSON.stringify(bf));
  await shot(page, 'vm5-board');
  await page.evaluate(() => document.querySelectorAll('.board-cell')[3].click()); await sleep(400);
  ok('M5b 方盘格开抽屉', await drawerOpen(page));
  await page.click('.drawer-close'); await sleep(300);
  await clickTab(page, '星象罗盘'); await sleep(300);

  await page.evaluate(() => document.getElementById('timeline').scrollIntoView({ behavior: 'instant', block: 'center' }));
  await sleep(400);
  const q0 = await page.$eval('.tl-progress', (e) => e.textContent);
  await page.click('.tl-play'); await sleep(4600);
  const q1 = await page.$eval('.tl-progress', (e) => e.textContent);
  await page.click('.tl-play'); await sleep(200);
  ok('M6 大限播放前进', q0 !== q1, `${q0}→${q1}`);

  await page.evaluate(() => document.getElementById('share').scrollIntoView({ behavior: 'instant', block: 'center' }));
  await sleep(600);
  const scw = await page.$eval('.share-canvas', (e) => Math.round(e.getBoundingClientRect().width));
  ok('M7a 星卡适配宽度', scw <= 390, `${scw}px`);
  const before = fs.readdirSync(DL).length;
  const dlT0 = Date.now();
  await page.click('.share-actions .btn-primary');
  let dl2 = false;
  for (let i = 0; i < 16; i++) {
    await sleep(500);
    if (fs.readdirSync(DL).some((f) => f.endsWith('.png') && fs.statSync(path.join(DL, f)).mtimeMs > dlT0)) { dl2 = true; break; }
  }
  ok('M7b 移动 PNG 导出', dl2, await page.$eval('.share-status', (e) => e.textContent));
  await shot(page, 'vm6-share');
  const ovM = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  ok('M8 移动零横向溢出', ovM <= 0, `差值${ovM}px`);
  await page.close();
}

await browser.close();
const realErrors = errors.filter((e) => !e.includes('favicon'));
ok('控制台零错误', realErrors.length === 0, realErrors.slice(0, 6).join(' || '));
console.log('\n========== 主流程实测结果 ==========');
for (const r of results) console.log(r);
console.log(`\n截图目录：${SHOTS}（vd*/vm*）；下载目录：${DL}`);
console.log(realErrors.length ? `\n控制台错误：\n${realErrors.join('\n')}` : '\n控制台错误：无');