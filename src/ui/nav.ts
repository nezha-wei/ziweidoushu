/**
 * 固定页头：品牌标识 + 分区锚点（scrollspy 高亮）+ 全局静音总开关 + 全屏菜单按钮。
 * 参照编辑排版式站点：透明页头滚动后转纸白；汉堡开启全屏白菜单（巨型编号链接）；
 * 桌面左侧固定竖轨直达分区，右侧固定侧注显示当前分区索引。
 * 移动端锚点行可横向滚动，所有控件始终可达。
 */
import { h } from './dom';
import { getState, setState, subscribe } from '../services/store';
import { sTap } from '../services/sound';

const LINKS = [
  { id: 'cast', no: '01', label: '起盘', en: 'CAST' },
  { id: 'chart', no: '02', label: '命盘', en: 'CHART' },
  { id: 'timeline', no: '03', label: '大限推演', en: 'TIMELINE' },
  { id: 'share', no: '04', label: '星卡', en: 'STAR CARD' },
  { id: 'about', no: '05', label: '关于', en: 'ABOUT' },
];

const BURGER_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
const CLOSE_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

export function mountNav(): { update: () => void } {
  const soundBtn = h('button', {
    class: 'sound-toggle',
    type: 'button',
    'aria-label': '切换音效',
    title: '音效总开关',
  });
  const menuBtn = h('button', {
    class: 'menu-btn', type: 'button', 'aria-label': '打开菜单', 'aria-expanded': 'false',
    html: BURGER_SVG,
  });
  const links = LINKS.map((l) =>
    h('a', { class: 'nav-link', href: `#${l.id}`, dataset: { target: l.id } },
      h('span', { class: 'nav-no', text: l.no }), l.label,
    ),
  );

  const nav = h('header', { class: 'nav', id: 'nav' },
    h('a', { class: 'brand', href: '#top', 'aria-label': '紫微斗数 首页' },
      h('span', { class: 'brand-mark', html: '<svg viewBox="0 0 32 32" width="26" height="26"><circle cx="16" cy="16" r="13" fill="none" stroke="#c8a03a" stroke-width="1.4"/><circle cx="16" cy="16" r="7" fill="none" stroke="#6e3da5" stroke-width="1.1" opacity=".8"/><path d="M16 3 L18.4 13.6 L29 16 L18.4 18.4 L16 29 L13.6 18.4 L3 16 L13.6 13.6 Z" fill="#c8a03a"/><circle cx="16" cy="16" r="2.4" fill="#a83228"/></svg>' }),
      h('span', { class: 'brand-text' }, '紫微斗数', h('em', { text: 'ZIWEI DOUSHU' })),
    ),
    h('nav', { class: 'nav-links', 'aria-label': '页面分区' }, links),
    h('div', { class: 'nav-actions' },
      soundBtn,
      menuBtn,
    ),
  );
  document.body.prepend(nav);

  // ---- 全屏白菜单 ----
  const menuLinks = LINKS.map((l) =>
    h('a', { class: 'menu-link', href: `#${l.id}` },
      h('span', { class: 'menu-no', text: l.no }),
      h('span', { class: 'menu-cn', text: l.label }),
      h('span', { class: 'menu-en', text: l.en }),
    ),
  );
  const menu = h('div', { class: 'menu-overlay', role: 'dialog', 'aria-label': '全站菜单', 'aria-modal': 'true' },
    h('nav', { class: 'menu-list' }, menuLinks),
    h('p', { class: 'menu-foot', text: '紫微斗数 · 浏览器本地排盘 · 不上传任何生辰' }),
  );
  document.body.appendChild(menu);
  let menuOpen = false;
  function setMenu(open: boolean): void {
    menuOpen = open;
    menu.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    menuBtn.innerHTML = open ? CLOSE_SVG : BURGER_SVG;
  }
  menuBtn.addEventListener('click', () => { sTap(); setMenu(!menuOpen); });
  for (const a of menuLinks) a.addEventListener('click', () => setMenu(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen) setMenu(false);
  });

  // ---- 左侧竖轨 + 右侧侧注（桌面） ----
  const railLinks = LINKS.map((l) =>
    h('a', { class: 'rail-link', href: `#${l.id}`, dataset: { target: l.id }, 'aria-label': l.label },
      h('span', { text: l.no }),
      h('span', { class: 'rail-label', text: l.label }),
    ),
  );
  const rail = h('nav', { class: 'rail', 'aria-label': '分区竖轨' }, railLinks);
  const sideCur = h('b', { text: '00 / TOP' });
  const sideNote = h('div', { class: 'side-note', 'aria-hidden': 'true' },
    sideCur, h('span', { text: '紫微斗数 · 本地排盘' }),
  );
  document.body.append(rail, sideNote);

  function renderSound(): void {
    const on = getState().soundOn;
    soundBtn.classList.toggle('muted', !on);
    soundBtn.setAttribute('aria-pressed', String(on));
    soundBtn.innerHTML = on
      ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" stroke="none"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg><span>音效开</span>'
      : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" stroke="none"/><path d="m16 9 5 6M21 9l-5 6"/></svg><span>已静音</span>';
  }

  soundBtn.addEventListener('click', () => {
    const next = !getState().soundOn;
    setState({ soundOn: next });
    if (next) sTap();
  });

  // scrollspy：以视口中部的分区为当前（分区在导航挂载后才插入 DOM，需每次现查）
  function spy(): void {
    const mid = window.innerHeight * 0.4;
    let current = '';
    for (const l of LINKS) {
      const sec = document.getElementById(l.id);
      if (!sec) continue;
      const r = sec.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) { current = l.id; break; }
    }
    for (const a of links) a.classList.toggle('active', a.dataset.target === current);
    for (const a of railLinks) a.classList.toggle('active', a.dataset.target === current);
    const cur = LINKS.find((l) => l.id === current);
    sideCur.textContent = cur ? `${cur.no} / ${cur.en}` : '00 / TOP';
    nav.classList.toggle('scrolled', window.scrollY > 24);
  }
  window.addEventListener('scroll', spy, { passive: true });
  spy();

  const unsub = subscribe(renderSound);
  renderSound();
  return { update: () => { renderSound(); spy(); } };
}