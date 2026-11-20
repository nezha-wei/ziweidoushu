/**
 * 端到端 UI 实测（puppeteer-core 驱动本机 Edge，无头）。
 * 桌面 1440×900 与移动 390×844 双视口：渲染 / 主流程 / 控件 / 稳定性 / 溢出 / 控制台错误。
 * 运行：node scripts/uitest.mjs  （需先 npm run build 并启动 npm run preview）
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = 'http://localhost:4173/';
const SHOTS = path.resolve('shots');
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const errors = [];
function ok(name, cond, extra = '') {
  results.push(`${cond ? 'PASS' : 'FAIL'} | ${name}${extra ? ' | ' + extra : ''}`);
  if (!cond) process.exitCode = 1;
}

async function newPage(browser, width, height, mobile) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[console ${width}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[pageerror ${width}] ${e.message}`));
  return page;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitChart(page) {
  await page.waitForSelector('.compass-svg .sector', { timeout: 15000 });
  await sleep(900);
}

async function clickSector(page, index) {
  // 先把罗盘滚到视口中央，再按扇区中心角 + 当前旋转角换算屏幕坐标
  await page.evaluate(() => document.querySelector('.compass-wrap').scrollIntoView({ behavior: 'instant', block: 'center' }));
  await sleep(300);
  const pt = await page.evaluate((i) => {
    const svg = document.querySelector('.compass-svg');
    const r = svg.getBoundingClientRect();
    const m = /rotate\(([-\d.]+)/.exec(document.querySelector('.compass-rotor').getAttribute('transform') || '');
    const rot = m ? parseFloat(m[1]) : 0;
    const toScreen = (rad, angDeg) => {
      const a = ((angDeg + rot) * Math.PI) / 180;
      const x = 500 + rad * Math.cos(a);
      const y = 500 + rad * Math.sin(a);
      return { x: r.left + (x / 1000) * r.width, y: r.top + (y / 1000) * r.height };
    };
    // 星曜文本为水平排布，径向上可能侵入空白带；扫描候选点直到 elementFromPoint 直接命中扇区
    const base = i * 30 - 75;
    for (const rad of [374, 380, 368, 430, 445, 322, 232]) {
      for (const da of [0, 5, -5, 9, -9]) {
        const p = toScreen(rad, base + da);
        const el = document.elementFromPoint(p.x, p.y);
        if (el && el.classList && el.classList.contains('sector')) return p;
      }
    }
    return toScreen(374, base);
  }, index);
  await page.mouse.click(pt.x, pt.y);
  await sleep(500);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
}

async function scrollTo(page, id) {
  await page.evaluate((sid) => document.getElementById(sid).scrollIntoView({ behavior: 'instant', block: 'start' }), id);
  await sleep(600);
}

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'],
});
await browser.defaultBrowserContext().overridePermissions(URL, ['clipboard-read', 'clipboard-write']);

// ================= 桌面 1440×900 =================
{
  const page = await newPage(browser, 1440, 900, false);
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await waitChart(page);

  ok('桌面·首屏渲染', await page.$eval('.hero-title-cn', (e) => e.textContent.includes('紫微斗数')));
  ok('桌面·示例盘自动加载', await page.$$eval('.compass-svg .sector', (e) => e.length) === 12);
  ok('桌面·中心原型', await page.$eval('.center-archetype', (e) => e.textContent.length > 0));
  ok('桌面·导航固定', await page.$eval('.nav', (e) => getComputedStyle(e).position === 'fixed'));
  ok('桌面·音效开关默认开', await page.$eval('.sound-toggle', (e) => e.getAttribute('aria-pressed') === 'true'));
  ok('桌面·海报廊六卡', await page.$$eval('.poster-card', (e) => e.length) === 6);
  ok('桌面·海报插画加载', await page.$eval('.poster-card img', (e) => e.complete && e.naturalWidth > 0));
  ok('桌面·左竖轨可见', await page.$eval('.rail', (e) => e.offsetHeight > 0 && getComputedStyle(e).display !== 'none'));
  // 全屏菜单开合
  await page.click('.menu-btn');
  await sleep(500);
  ok('桌面·全屏菜单打开', await page.$eval('.menu-overlay', (e) => e.classList.contains('open')));
  await page.keyboard.press('Escape');
  await sleep(500);
  ok('桌面·ESC关闭菜单', await page.$eval('.menu-overlay', (e) => !e.classList.contains('open')));
  await shot(page, 'd1-hero');

  await scrollTo(page, 'chart');
  ok('桌面·控制台可见', await page.$eval('.ctrl-panel', (e) => e.offsetHeight > 100));
  const toolCount = await page.$$eval('.ctrl-panel .mini-tgl, .ctrl-panel .ctrl-range, .ctrl-panel .seg-btn, .ctrl-panel .ctrl-reset', (e) => e.length);
  ok('桌面·控制工具≥7', toolCount >= 7, `共${toolCount}件`);
  await shot(page, 'd2-chart');

  // 宫位点击 → 抽屉
  await clickSector(page, 2);
  ok('桌面·宫位抽屉打开', await page.$eval('.drawer-root', (e) => e.classList.contains('open')));
  ok('桌面·抽屉标题含宫名', await page.$eval('.drawer-title', (e) => /夫妻|兄弟|命宫|子女|财帛|疾厄|迁移|仆役|官禄|田宅|福德|父母/.test(e.textContent)));
  await shot(page, 'd3-drawer');
  await page.keyboard.press('Escape');
  await sleep(500);
  ok('桌面·ESC关闭抽屉', await page.$eval('.drawer-root', (e) => !e.classList.contains('open')));

  // 主星点击
  const starPt = await page.evaluate(() => {
    const t = [...document.querySelectorAll('.star-major')].find((x) => x.textContent === '紫微');
    const r = t.getBoundingClientRect();
    return { x: r.left + r.width * 0.3, y: r.top + r.height / 2 };
  });
  await page.mouse.click(starPt.x, starPt.y);
  await sleep(500);
  if (!(await page.$eval('.drawer-root', (e) => e.classList.contains('open')))) {
    await page.evaluate(() => {
      const t = [...document.querySelectorAll('.star-major')].find((x) => x.textContent === '紫微');
      t.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await sleep(500);
  }
  ok('桌面·星曜解读', await page.$eval('.drawer-title', (e) => e.textContent.includes('紫微')));
  await page.evaluate(() => document.querySelector('.drawer-close').click());
  await sleep(500);

  // 控制台实时调节
  await page.evaluate(() => {
    const set = (label, v) => {
      const el = [...document.querySelectorAll('.ctrl-range')].find((x) => x.getAttribute('aria-label') === label);
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    set('星曜大小', 1.4); set('光晕强度', 0.4); set('旋转速度', 1.2);
  });
  ok('桌面·星曜大小生效', await page.$eval('.compass-svg', (e) => e.style.getPropertyValue('--star-scale') === '1.4'));
  ok('桌面·光晕生效', await page.$eval('.compass-svg', (e) => e.style.getPropertyValue('--glow') === '0.4'));
  await page.evaluate(() => {
    const tgl = (label) => {
      const l = [...document.querySelectorAll('.mini-tgl')].find((x) => x.textContent.includes(label));
      l.querySelector('input').click();
    };
    tgl('四化飞星'); tgl('三方四正'); tgl('刻度网格'); tgl('聚焦景深');
  });
  ok('桌面·飞星图层关闭', await page.$eval('.layer-flights', (e) => e.style.display === 'none'));
  await page.evaluate(() => {
    const tgl = (label) => {
      const l = [...document.querySelectorAll('.mini-tgl')].find((x) => x.textContent.includes(label));
      l.querySelector('input').click();
    };
    tgl('四化飞星'); tgl('三方四正'); tgl('刻度网格'); tgl('聚焦景深');
  });

  // 拖拽旋转 + 拖拽后点击仍有效
  const dragBox = await page.$eval('.compass-svg', (e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const before = await page.$eval('.compass-rotor', (e) => e.getAttribute('transform'));
  await page.mouse.move(dragBox.x + dragBox.w * 0.5, dragBox.y + dragBox.h * 0.12);
  await page.mouse.down();
  await page.mouse.move(dragBox.x + dragBox.w * 0.85, dragBox.y + dragBox.h * 0.4, { steps: 8 });
  await page.mouse.up();
  await sleep(300);
  const after = await page.$eval('.compass-rotor', (e) => e.getAttribute('transform'));
  ok('桌面·拖拽旋转生效', before !== after);
  await clickSector(page, 2);
  ok('桌面·拖拽后宫位点击仍有效', await page.$eval('.drawer-root', (e) => e.classList.contains('open')));
  await page.keyboard.press('Escape');
  await sleep(400);

  // 视图切换（缺陷②回归）
  await page.evaluate(() => [...document.querySelectorAll('.ctrl-panel .seg-btn')].find((b) => b.textContent.includes('方盘')).click());
  await sleep(400);
  ok('桌面·方盘显示', await page.$eval('.board-wrap', (e) => e.style.display !== 'none' && e.offsetHeight > 0));
  ok('桌面·方盘时罗盘隐藏', await page.$eval('.compass-wrap', (e) => e.style.display === 'none'));
  await shot(page, 'd4-board');
  await page.evaluate(() => [...document.querySelectorAll('.ctrl-panel .seg-btn')].find((b) => b.textContent.includes('罗盘')).click());
  await sleep(400);
  ok('桌面·切回罗盘后方盘隐藏(缺陷②)', await page.$eval('.board-wrap', (e) => e.style.display === 'none'));

  // 错误态（缺陷③回归）
  await scrollTo(page, 'cast');
  await page.evaluate(() => {
    const y = document.querySelector('input[aria-label="出生年份"]');
    y.value = '1800'; y.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.click('.cast-submit');
  await sleep(1300);
  const errVisible = await page.$eval('.cast-error', (e) => e.style.display === 'block' && e.offsetHeight > 20);
  ok('桌面·错误框可见(缺陷③)', errVisible);
  ok('桌面·错误码正确', await page.$eval('.cast-error', (e) => e.textContent.includes('UNSUPPORTED_YEAR')));
  await shot(page, 'd5-error');

  // 正常排盘主流程
  await page.evaluate(() => {
    const set = (sel, v) => { const el = document.querySelector(sel); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
    set('input[aria-label="出生年份"]', '1995');
    set('input[aria-label="出生月份"]', '10');
    set('input[aria-label="出生日期"]', '1');
    set('input[aria-label="出生分钟"]', '15');
    const hour = document.querySelector('select[aria-label="出生小时"]');
    hour.value = '6'; hour.dispatchEvent(new Event('change', { bubbles: true }));
    [...document.querySelectorAll('.cast-form .seg-btn')].find((b) => b.textContent === '男').click();
    const nick = document.querySelector('input[aria-label="昵称"]');
    nick.value = '测试旅人'; nick.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.click('.cast-submit');
  await sleep(1600);
  ok('桌面·排盘成功状态', await page.$eval('.cast-error', (e) => e.style.display === 'none'));
  ok('桌面·新盘日期更新', await page.$eval('.compass-center', (e) => e.textContent.includes('1995-10-01')));
  ok('桌面·自动滚动到命盘', await page.evaluate(() => Math.abs(document.getElementById('chart').getBoundingClientRect().top) < 140));
  await shot(page, 'd6-newchart');

  // 大限推演
  await scrollTo(page, 'timeline');
  ok('桌面·12段大限', await page.$$eval('.tl-chip', (e) => e.length) === 12);
  await page.evaluate(() => [...document.querySelectorAll('.tl-play')][0].click());
  await sleep(4800);
  ok('桌面·自动推演前进', await page.$eval('.tl-progress', (e) => e.textContent.startsWith('2')));
  await page.evaluate(() => [...document.querySelectorAll('.tl-play')][0].click());
  await page.evaluate(() => [...document.querySelectorAll('.tl-controls .btn')].find((b) => b.textContent.includes('下一段')).click());
  await sleep(400);
  ok('桌面·下一段生效', await page.$eval('.tl-progress', (e) => e.textContent.startsWith('3')));
  await shot(page, 'd7-timeline');
  await page.evaluate(() => [...document.querySelectorAll('.tl-detail .btn')].find((b) => b.textContent.includes('定位')).click());
  await sleep(900);
  ok('桌面·定位联动抽屉', await page.$eval('.drawer-root', (e) => e.classList.contains('open')));
  await page.keyboard.press('Escape');
  await sleep(400);

  // 星卡
  await scrollTo(page, 'share');
  const painted = await page.evaluate(() => {
    const c = document.querySelector('.share-canvas');
    const d = c.getContext('2d').getImageData(540, 760, 1, 1).data;
    return d[0] + d[1] + d[2] > 40;
  });
  ok('桌面·星卡已绘制', painted);
  ok('桌面·五维指标', await page.$$eval('.metric-row', (e) => e.length) === 5);
  await page.evaluate(() => [...document.querySelectorAll('.share-actions .btn')].find((b) => b.textContent.includes('复制')).click());
  await sleep(600);
  ok('桌面·复制判词', await page.$eval('.share-status', (e) => e.textContent.includes('复制')));
  await page.evaluate(() => [...document.querySelectorAll('.share-actions .btn')].find((b) => b.textContent.includes('下载')).click());
  await sleep(2200);
  ok('桌面·PNG导出', await page.$eval('.share-status', (e) => e.textContent.includes('导出')));
  await shot(page, 'd8-share');

  // 重复排盘稳定性
  await scrollTo(page, 'cast');
  for (let i = 0; i < 3; i++) { await page.click('.cast-submit'); await sleep(120); }
  await sleep(2200);
  ok('桌面·重复排盘无残留', await page.$$eval('.compass-svg .sector', (e) => e.length) === 12);
  ok('桌面·罗盘唯一', await page.$$eval('.compass-svg', (e) => e.length) === 1);

  // 关于 / 锚点 / 静音
  await scrollTo(page, 'about');
  ok('桌面·关于与古籍', await page.$$eval('.classic-card', (e) => e.length) === 6);
  await page.evaluate(() => document.querySelector('.nav-link[href="#cast"]').click());
  await sleep(1800);
  ok('桌面·锚点避开导航', await page.evaluate(() => document.getElementById('cast').getBoundingClientRect().top >= 60 && document.getElementById('cast').getBoundingClientRect().top < 140));
  await page.click('.sound-toggle');
  ok('桌面·静音切换', await page.$eval('.sound-toggle', (e) => e.classList.contains('muted')));
  await page.click('.sound-toggle');

  const overflowD = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok('桌面·无水平溢出', overflowD <= 0, `差值${overflowD}px`);
  await page.close();
}

// ================= 移动 390×844 =================
{
  const page = await newPage(browser, 390, 844, true);
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await waitChart(page);
  ok('移动·首屏渲染', await page.$eval('.hero-title-cn', (e) => e.textContent.includes('紫微斗数')));
  ok('移动·海报廊六卡', await page.$$eval('.poster-card', (e) => e.length) === 6);
  // 移动端全屏菜单开合
  await page.click('.menu-btn');
  await sleep(500);
  ok('移动·全屏菜单打开', await page.$eval('.menu-overlay', (e) => e.classList.contains('open')));
  await page.evaluate(() => document.querySelector('.menu-link[href="#cast"]').click());
  await sleep(900);
  ok('移动·菜单链接跳转并关闭', await page.$eval('.menu-overlay', (e) => !e.classList.contains('open')));
  ok('移动·示例盘加载', await page.$$eval('.compass-svg .sector', (e) => e.length) === 12);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await sleep(500);
  await shot(page, 'm1-hero');

  const overflowM1 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok('移动·首屏无溢出', overflowM1 <= 0, `差值${overflowM1}px`);

  // 导航可达性
  ok('移动·静音开关可见', await page.$eval('.sound-toggle', (e) => e.getBoundingClientRect().width > 0));
  ok('移动·锚点行可横滚', await page.$eval('.nav-links', (e) => e.scrollWidth >= e.clientWidth));

  await scrollTo(page, 'chart');
  const compassW = await page.$eval('.compass-wrap', (e) => e.getBoundingClientRect().width);
  ok('移动·罗盘适配宽度', compassW <= 390 && compassW > 280, `${Math.round(compassW)}px`);
  ok('移动·控制台在罗盘下方可达', await page.$eval('.ctrl-panel', (e) => e.getBoundingClientRect().top > 0));
  await shot(page, 'm2-chart');

  await clickSector(page, 4);
  ok('移动·抽屉打开', await page.$eval('.drawer-root', (e) => e.classList.contains('open')));
  const drawerW = await page.$eval('.drawer', (e) => e.getBoundingClientRect().width);
  ok('移动·抽屉全宽', drawerW >= 388, `${Math.round(drawerW)}px`);
  await shot(page, 'm3-drawer');
  await page.evaluate(() => document.querySelector('.drawer-close').click());
  await sleep(500);

  // 方盘横滚不溢出页面
  await page.evaluate(() => [...document.querySelectorAll('.ctrl-panel .seg-btn')].find((b) => b.textContent.includes('方盘')).click());
  await sleep(400);
  const overflowBoard = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok('移动·方盘无页面溢出', overflowBoard <= 0, `差值${overflowBoard}px`);
  await shot(page, 'm4-board');
  await page.evaluate(() => [...document.querySelectorAll('.ctrl-panel .seg-btn')].find((b) => b.textContent.includes('罗盘')).click());
  await sleep(300);

  // 主流程
  await scrollTo(page, 'cast');
  await page.evaluate(() => {
    const set = (sel, v) => { const el = document.querySelector(sel); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
    set('input[aria-label="出生年份"]', '1988');
    set('input[aria-label="出生月份"]', '8');
    set('input[aria-label="出生日期"]', '8');
    const hour = document.querySelector('select[aria-label="出生小时"]');
    hour.value = '8'; hour.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.click('.cast-submit');
  await sleep(1600);
  ok('移动·排盘成功', await page.$eval('.compass-center', (e) => e.textContent.includes('1988-08-08')));
  await shot(page, 'm5-newchart');

  await scrollTo(page, 'timeline');
  ok('移动·时间轴渲染', await page.$$eval('.tl-chip', (e) => e.length) === 12);
  await page.evaluate(() => [...document.querySelectorAll('.tl-controls .btn')].find((b) => b.textContent.includes('下一段')).click());
  await sleep(400);
  await shot(page, 'm6-timeline');

  await scrollTo(page, 'share');
  const canvasW = await page.$eval('.share-canvas', (e) => e.getBoundingClientRect().width);
  ok('移动·星卡适配', canvasW <= 390, `${Math.round(canvasW)}px`);
  await shot(page, 'm7-share');

  await scrollTo(page, 'about');
  await shot(page, 'm8-about');
  const overflowM2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok('移动·全程无水平溢出', overflowM2 <= 0, `差值${overflowM2}px`);

  // 所有分区右边界检查
  const bad = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('section, .card, .drawer, .nav').forEach((el) => {
      // 关闭态抽屉故意移出视口（translateX(105%)），不计为越界
      if (el.classList.contains('drawer') && !el.closest('.drawer-root').classList.contains('open')) return;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > window.innerWidth + 2) out.push(`${el.className || el.id}: right=${Math.round(r.right)}`);
    });
    return out;
  });
  ok('移动·无越界元素', bad.length === 0, bad.join('; '));
  await page.close();
}

await browser.close();

const realErrors = errors.filter((e) => !e.includes('favicon'));
ok('控制台零错误', realErrors.length === 0, realErrors.slice(0, 6).join(' || '));

console.log('\n========== UI 实测结果 ==========');
for (const r of results) console.log(r);
console.log(`\n截图目录：${SHOTS}`);
console.log(realErrors.length ? `\n控制台错误：\n${realErrors.join('\n')}` : '\n控制台错误：无');