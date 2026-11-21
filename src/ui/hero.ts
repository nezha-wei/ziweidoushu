import { h } from './dom';
import { Solar } from 'lunar-javascript';
import { CLASSICS } from '../content/classics';
import { MAJOR_STARS } from '../content/stars';
import { getState, setState } from '../services/store';
import { sTap } from '../services/sound';

/** 五行 → 伙伴头像底色（与 tokens 五行色一致，白字） */
const ELEMENT_COLOR: Record<string, string> = {
  木: '#4a7a4f', 火: '#a8503a', 土: '#8b5a2b', 金: '#c8a03a', 水: '#2f5a82',
};

/** 海报廊入口卡：编号 / 插画 / 中文标题 / 英文小标 / 一句描述 / 锚点 */
const POSTERS: { no: string; img: string; cn: string; en: string; desc: string; href: string }[] = [
  { no: '01', img: 'posters/destiny.png', cn: '紫微命盘', en: 'DESTINY ENGINE', desc: '输入生辰八字，十二宫命盘即时点亮。', href: '#cast' },
  { no: '02', img: 'posters/compass.png', cn: '星象罗盘', en: 'STAR COMPASS', desc: '拖拽旋转的星象罗盘，点击宫位与星曜看解读。', href: '#chart' },
  { no: '03', img: 'posters/timeline.png', cn: '大限推演', en: 'LIFE TIMELINE', desc: '十二段大限与流年四化，播放一生运势起伏。', href: '#timeline' },
  { no: '04', img: 'posters/card.png', cn: '人格星卡', en: 'STAR CARD', desc: '五维人格指标与判词，导出专属星卡分享。', href: '#share' },
  { no: '05', img: 'posters/patterns.png', cn: '格局图鉴', en: 'PATTERN ATLAS', desc: '二十条格局规则自动检定，标注成格宫位。', href: '#patterns' },
  { no: '06', img: 'posters/classics.png', cn: '古籍书院', en: 'CLASSICS', desc: '紫微斗数全书等古籍原文与白话提示。', href: '#about' },
];

export function mountHero(onSample: () => void): { el: HTMLElement; update: () => void } {
  // ---- 今日日期徽章（公历 + 农历干支） ----
  const now = new Date();
  const lunar = Solar.fromYmdHms(now.getFullYear(), now.getMonth() + 1, now.getDate(), 12, 0, 0).getLunar();
  const week = '日一二三四五六'[now.getDay()];
  const dateText = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${week} · ${lunar.getYearInGanZhi()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;

  // ---- 古籍轮播 + 进度刻度 ----
  const quoteText = h('p', { class: 'hero-quote-text' });
  const quoteSrc = h('span', { class: 'hero-quote-src' });
  const dashes = CLASSICS.map(() => h('span', { class: 'hero-dash' }));
  let qi = 0;
  function showQuote(i: number): void {
    const q = CLASSICS[i % CLASSICS.length];
    quoteText.textContent = `「${q.text}」`;
    quoteSrc.textContent = `${q.source} · ${q.hint}`;
    dashes.forEach((d, k) => d.classList.toggle('on', k === i % CLASSICS.length));
  }
  showQuote(0);
  const quoteTimer = window.setInterval(() => {
    qi = (qi + 1) % CLASSICS.length;
    const box = quoteText.parentElement!;
    box.classList.remove('quote-in');
    void box.offsetWidth;
    box.classList.add('quote-in');
    showQuote(qi);
  }, 7000);
  void quoteTimer;

  // ---- 十四主星伙伴行：点击直达该星解读 ----
  const crew = h('span', { class: 'hero-crew' },
    Object.values(MAJOR_STARS).map((s) => {
      const chip = h('button', {
        type: 'button', class: 'hero-crew-chip', text: s.name[0],
        title: `${s.name} · ${s.archetype}`,
        'aria-label': `查看${s.name}解读`,
        style: { background: ELEMENT_COLOR[s.element] ?? '#8b5a2b' },
      });
      chip.addEventListener('click', () => {
        sTap();
        if (getState().chart) {
          setState({ selectedStar: s.name, selectedPalace: null, drawerOpen: true });
          document.getElementById('chart')?.scrollIntoView({ behavior: 'smooth' });
        } else {
          document.getElementById('cast')?.scrollIntoView({ behavior: 'smooth' });
        }
      });
      return chip;
    }),
  );

  const sampleBtn = h('button', { type: 'button', class: 'btn btn-primary hero-sample', text: '先看示例 · 不用填' }) as HTMLButtonElement;
  sampleBtn.addEventListener('click', () => { sTap(); onSample(); });
  const myChart = h('a', { class: 'btn btn-ghost hero-personal', href: '#cast', text: '测我的 · 填出生信息' });
  myChart.addEventListener('click', () => sTap());
  const actions = h('div', { class: 'hero-actions anim-3' }, sampleBtn, myChart);

  // ---- 视图快捷切换（罗盘·当前 / 方盘 / 大限 / 星卡） ----
  function go(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
  function modeBtn(label: string, onClick: () => void): HTMLElement {
    const b = h('button', { type: 'button', class: 'hero-mode' },
      label, h('i', { class: 'hero-mode-cur', text: ' · 当前' }),
    );
    b.addEventListener('click', () => { sTap(); onClick(); });
    return b;
  }
  const modeCompass = modeBtn('罗盘', () => { setState({ viewMode: 'compass' }); go('chart'); });
  const modeBoard = modeBtn('方盘', () => { setState({ viewMode: 'board' }); go('chart'); });
  const modeTimeline = modeBtn('大限推演', () => go('timeline'));
  const modeShare = modeBtn('人格星卡', () => go('share'));

  // ---- 海报竖廊：六张原创工笔插画入口卡 ----
  const gallery = h('div', { class: 'hero-gallery' },
    POSTERS.map((p, i) => h('a', {
      class: 'poster-card', href: p.href, 'aria-label': `前往${p.cn}`,
    },
      h('img', {
        src: p.img, alt: `${p.cn} · 奶金国风工笔插画`,
        loading: i === 0 ? 'eager' : 'lazy', decoding: 'async', width: '768', height: '1024',
      }),
      h('span', { class: 'poster-scrim', 'aria-hidden': 'true' }),
      h('span', { class: 'poster-index', text: `${p.no} /` }),
      h('span', { class: 'poster-arrow', 'aria-hidden': 'true', text: '↗' }),
      h('span', { class: 'poster-body' },
        h('span', { class: 'poster-title', text: p.cn }),
        h('span', { class: 'poster-en', text: p.en }),
        h('span', { class: 'poster-desc', text: p.desc }),
      ),
    )),
  );
  gallery.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.poster-card')) sTap();
  });

  const section = h('section', { class: 'hero', id: 'top' },
    h('div', { class: 'hero-masthead' },
      h('div', { class: 'hero-badges anim-1' },
        h('span', { class: 'hero-date', text: `☾ ${dateText}` }),
        h('span', { class: 'hero-kicker', text: '2026 QODER 高校创造力大赛 · LIFEHACK 赛道' }),
      ),
      h('h1', { class: 'hero-title anim-2' },
        h('span', { class: 'hero-title-cn' },
          h('span', { class: 'hero-title-text', text: '紫微斗数' }),
          h('span', { class: 'hero-title-emblem', 'aria-hidden': 'true', html: emblemSvg() }),
        ),
        h('span', { class: 'hero-title-sub' }, '和你的十四主星', crew),
      ),
      h('p', { class: 'hero-lede anim-3', text: '不懂星曜也能看懂自己的一种可能。先看一句白话解读，再转动星盘，带走你的专属星卡。' }),
      actions,
      h('p', { class: 'hero-hint anim-3', text: '无需登录 · 本机计算 · 分享默认隐藏生辰 · 仅供文化娱乐' }),
      h('p', { class: 'hero-stats-line anim-3' },
        h('b', { text: '紫微斗数' }), ' · 十四主星 · 十二宫位 · ',
        h('b', { text: '20' }), ' 条格局规则 · ', h('b', { text: '12' }), ' 段大限推演',
      ),
      h('div', { class: 'hero-quote anim-4 quote-in' }, quoteText, quoteSrc),
      h('div', { class: 'hero-dashes anim-4', 'aria-hidden': 'true' }, dashes),
      h('p', { class: 'hero-hint anim-6', text: '拖拽旋转罗盘 · 点击星曜看解读 · 命盘只存本机浏览器' }),
      h('div', { class: 'hero-modes anim-6' }, modeCompass, modeBoard, modeTimeline, modeShare),
    ),
    gallery,
    h('a', { class: 'hero-scroll', href: '#cast', 'aria-label': '向下滚动' },
      h('span', { class: 'hero-scroll-line' }), '向下探索',
    ),
  );

  function update(): void {
    const s = getState();
    modeCompass.classList.toggle('on', s.viewMode === 'compass');
    modeBoard.classList.toggle('on', s.viewMode === 'board');
    sampleBtn.disabled = s.status === 'computing';
  }
  update();
  return { el: section, update };
}

/** 标题旁的小星徽（奶金底 + 金四芒星 + 朱砂心，呼应 favicon） */
function emblemSvg(): string {
  return `<svg viewBox="0 0 48 48" width="72%" height="72%">
    <path d="M24 4 L28.4 19.6 L44 24 L28.4 28.4 L24 44 L19.6 28.4 L4 24 L19.6 19.6 Z" fill="#c8a03a"/>
    <circle cx="24" cy="24" r="4" fill="#a83228"/>
  </svg>`;
}