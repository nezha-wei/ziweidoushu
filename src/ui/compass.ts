/**
 * 可交互罗盘（视觉主体）。
 * SVG 十二宫扇区 + 星曜 + 四化飞星弧线动画 + 三方四正连线 + 刻度网格 + 聚焦景深。
 * 旋转由内部单 rAF 管理（自动旋转 / 指针拖拽 / 手动方位滑杆），不进订阅状态。
 * build-once + diff-update：命盘变化才重建扇区，选中/参数变化只更新类与图层。
 */
import { h, s, clear, polar } from './dom';
import type { AppState } from '../services/store';
import { getState, setState } from '../services/store';
import type { Chart, SiHuaFlight } from '../engine/types';
import { MUTAGEN_COLOR } from '../engine/sihua';
import { palaceFlights, surroundedIndices } from '../engine/ziwei';
import { randomClassic } from '../content/classics';
import { sSelect } from '../services/sound';

const C = 500;
const R_OUT = 458, R_NAME = 414, R_SUB = 390, R_MAJOR = 350, R_MINOR = 306, R_ADJ = 276, R_DEC = 246, R_IN = 206;
const BRANCHES = '寅卯辰巳午未申酉戌亥子丑';

function sectorPath(i: number): string {
  const a0 = i * 30 - 90, a1 = a0 + 30;
  const [x0, y0] = polar(C, C, R_IN, a0);
  const [x1, y1] = polar(C, C, R_OUT, a0);
  const [x2, y2] = polar(C, C, R_OUT, a1);
  const [x3, y3] = polar(C, C, R_IN, a1);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} L${x1.toFixed(1)} ${y1.toFixed(1)} A${R_OUT} ${R_OUT} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L${x3.toFixed(1)} ${y3.toFixed(1)} A${R_IN} ${R_IN} 0 0 0 ${x0.toFixed(1)} ${y0.toFixed(1)} Z`;
}

function midAngle(i: number): number {
  return i * 30 - 90 + 15;
}

export function mountCompass(): {
  el: HTMLElement; update: (st: AppState) => void; setAngle: (deg: number) => void; resetView: () => void;
} {
  const svg = s('svg', {
    class: 'compass-svg', viewBox: '0 0 1000 1000', role: 'img',
    'aria-label': '紫微斗数十二宫罗盘',
  });
  const loading = h('div', { class: 'compass-loading' },
    h('div', { class: 'compass-spinner' }),
    h('p', { text: '排盘推演中…' }),
  );
  const empty = h('div', { class: 'compass-empty' });
  const wrap = h('div', { class: 'compass-wrap' }, svg, loading, empty);

  // defs：四化箭头 + 中心渐变
  const defs = s('defs');
  for (const [m, color] of Object.entries(MUTAGEN_COLOR)) {
    defs.appendChild(s('marker', {
      id: `arrow-${m}`, viewBox: '0 0 10 10', refX: 8, refY: 5,
      markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse',
    }, s('path', { d: 'M0 0 L10 5 L0 10 z', fill: color })));
  }
  const grad = s('radialGradient', { id: 'centerGrad', cx: '50%', cy: '42%', r: '70%' },
    s('stop', { offset: '0%', 'stop-color': '#fbf7ec' }),
    s('stop', { offset: '60%', 'stop-color': '#f3ead6' }),
    s('stop', { offset: '100%', 'stop-color': '#ece1c8' }),
  );
  defs.appendChild(grad);
  svg.appendChild(defs);

  // 静态外环刻度
  const outer = s('g', { class: 'compass-outer' });
  for (let i = 0; i < 72; i++) {
    const a = i * 5 - 90;
    const long = i % 6 === 0;
    const [x1, y1] = polar(C, C, long ? 464 : 470, a);
    const [x2, y2] = polar(C, C, 480, a);
    outer.appendChild(s('line', {
      x1, y1, x2, y2, stroke: long ? '#c8a03a' : '#b0b0b0',
      'stroke-width': long ? 1.8 : 0.8, opacity: long ? 0.9 : 0.5,
    }));
  }
  outer.appendChild(s('circle', { cx: C, cy: C, r: 484, fill: 'none', stroke: '#c8a03a', 'stroke-width': 1, opacity: 0.55 }));
  outer.appendChild(s('circle', { cx: C, cy: C, r: 462, fill: 'none', stroke: '#b0b0b0', 'stroke-width': 0.6, opacity: 0.5 }));
  svg.appendChild(outer);

  const rotor = s('g', { class: 'compass-rotor' });
  const gridLayer = s('g', { class: 'layer-grid' });
  const sectorLayer = s('g', { class: 'layer-sectors' });
  const starLayer = s('g', { class: 'layer-stars stars-glow' });
  const sanfangLayer = s('g', { class: 'layer-sanfang' });
  const flightLayer = s('g', { class: 'layer-flights' });
  rotor.appendChild(gridLayer);
  rotor.appendChild(sectorLayer);
  rotor.appendChild(sanfangLayer);
  rotor.appendChild(starLayer);
  rotor.appendChild(flightLayer);
  svg.appendChild(rotor);

  const centerLayer = s('g', { class: 'compass-center' });
  svg.appendChild(centerLayer);

  // ---- 旋转控制 ----
  let angle = 0;
  let dragging = false;
  let dragStart = 0;
  let angleStart = 0;
  let downPt: { x: number; y: number } | null = null;
  let raf = 0;
  let lastT = 0;

  function pointerAngle(e: PointerEvent): number {
    const r = svg.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    return (Math.atan2(y, x) * 180) / Math.PI;
  }
  // 位移超过阈值才启用拖拽与指针捕获，
  // 避免纯点击被捕获重定向到 svg 而丢失宫位 / 星曜的 click。
  svg.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return; // 触屏用手动方位滑杆，避免与页面滚动冲突
    downPt = { x: e.clientX, y: e.clientY };
    dragStart = pointerAngle(e);
    angleStart = angle;
  });
  svg.addEventListener('pointermove', (e) => {
    if (!downPt) return;
    if (!dragging) {
      const d = Math.hypot(e.clientX - downPt.x, e.clientY - downPt.y);
      if (d < 5) return;
      dragging = true;
      svg.setPointerCapture(e.pointerId);
      svg.classList.add('dragging');
    }
    angle = angleStart + (pointerAngle(e) - dragStart);
  });
  function endDrag(e: PointerEvent): void {
    downPt = null;
    if (!dragging) return;
    dragging = false;
    svg.classList.remove('dragging');
    try { svg.releasePointerCapture(e.pointerId); } catch { /* 已释放 */ }
  }
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  function loop(now: number): void {
    raf = requestAnimationFrame(loop);
    const st = getState();
    const dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0.016;
    lastT = now;
    if (document.hidden) return;
    if (st.autoRotate && !dragging && !st.reducedMotion && st.chart) {
      angle += st.rotateSpeed * 6 * dt;
    }
    rotor.setAttribute('transform', `rotate(${angle.toFixed(2)} ${C} ${C})`);
  }
  raf = requestAnimationFrame(loop);

  // ---- 构建 ----
  let builtId = '';
  let flightKey = '';
  let sanfangKey = '';

  function buildGrid(): void {
    clear(gridLayer);
    for (const r of [R_IN, R_DEC, R_ADJ, R_MINOR, R_MAJOR, R_NAME + 12, R_OUT]) {
      gridLayer.appendChild(s('circle', { cx: C, cy: C, r, fill: 'none', stroke: '#1a1a18', 'stroke-width': 0.6, opacity: 0.14 }));
    }
    for (let i = 0; i < 12; i++) {
      const [x1, y1] = polar(C, C, R_IN, i * 30 - 90);
      const [x2, y2] = polar(C, C, R_OUT, i * 30 - 90);
      gridLayer.appendChild(s('line', { x1, y1, x2, y2, stroke: '#1a1a18', 'stroke-width': 0.6, opacity: 0.16 }));
    }
  }

  function starText(
    name: string, x: number, y: number, size: number, fill: string, cls: string,
    mutagen?: string, brightness?: string,
  ): SVGElement {
    const g = s('g', { class: `star-hit ${cls}` });
    const t = s('text', {
      x, y, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
      fill, 'font-size': size, class: cls,
    });
    t.textContent = name;
    g.appendChild(t);
    if (brightness) {
      const b = s('text', {
        x, y: y + size * 0.72, 'text-anchor': 'middle', fill: '#6e6e66',
        'font-size': size * 0.46, class: 'star-bright',
      });
      b.textContent = brightness;
      g.appendChild(b);
    }
    if (mutagen) {
      const color = MUTAGEN_COLOR[mutagen as keyof typeof MUTAGEN_COLOR];
      const bs = size * 0.8;
      g.appendChild(s('rect', {
        x: x + size * 0.86 - bs / 2, y: y - size * 0.62 - bs / 2,
        width: bs, height: bs, rx: 2.5, fill: color,
      }));
      const mt = s('text', {
        x: x + size * 0.86, y: y - size * 0.6, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
        fill: '#ffffff', 'font-size': size * 0.46, 'font-weight': 700,
      });
      mt.textContent = mutagen;
      g.appendChild(mt);
    }
    g.addEventListener('click', (e) => {
      e.stopPropagation();
      sSelect();
      setState({ selectedStar: name, selectedPalace: null, drawerOpen: true });
    });
    return g;
  }

  function buildChart(chart: Chart): void {
    clear(sectorLayer); clear(starLayer); clear(centerLayer);
    buildGrid();
    for (const p of chart.palaces) {
      const am = midAngle(p.index);
      const path = s('path', {
        d: sectorPath(p.index), class: 'sector', dataset: { index: p.index },
        fill: p.isSoul ? 'rgba(168,50,40,0.10)' : 'rgba(255,255,255,0.65)',
        stroke: p.isSoul ? '#a83228' : 'rgba(0,0,0,0.20)',
        'stroke-width': p.isSoul ? 1.6 : 0.8,
      });
      path.addEventListener('click', () => {
        sSelect();
        setState({ selectedPalace: p.index, selectedStar: null, drawerOpen: true });
      });
      sectorLayer.appendChild(path);

      // 宫名 + 干支
      const [nx, ny] = polar(C, C, R_NAME, am);
      const nameT = s('text', {
        x: nx, y: ny, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
        fill: p.isSoul ? '#a83228' : '#1a1a18', 'font-size': 23, class: 'palace-name',
      });
      nameT.textContent = p.name;
      nameT.dataset.palace = String(p.index);
      starLayer.appendChild(nameT);
      const [sx, sy] = polar(C, C, R_SUB, am);
      const subT = s('text', {
        x: sx, y: sy, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
        fill: '#6e6e66', 'font-size': 13,
      });
      subT.textContent = `${p.stem}${p.branch}`;
      subT.dataset.palace = String(p.index);
      starLayer.appendChild(subT);

      // 命 / 身 / 来因 标记
      const tags: [string, string][] = [];
      if (p.isSoul) tags.push(['命', '#a83228']);
      if (p.isBody) tags.push(['身', '#1a56a8']);
      if (p.isOriginal) tags.push(['因', '#6e3da5']);
      tags.forEach(([tag, color], k) => {
        const [tx, ty] = polar(C, C, R_NAME + 24, am + (k - (tags.length - 1) / 2) * 7);
        starLayer.appendChild(s('rect', { x: tx - 9, y: ty - 9, width: 18, height: 18, rx: 3, fill: color, opacity: 0.95 }));
        const tt = s('text', {
          x: tx, y: ty + 0.5, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
          fill: '#ffffff', 'font-size': 11, 'font-weight': 700,
        });
        tt.textContent = tag;
        starLayer.appendChild(tt);
      });

      // 主星
      const majors = p.majorStars;
      majors.forEach((st, k) => {
        const a = am + (k - (majors.length - 1) / 2) * 9;
        const [x, y] = polar(C, C, R_MAJOR, a);
        const g = starText(st.name, x, y, 25, '#a83228', 'star-major', st.mutagen, st.brightness);
        g.dataset.palace = String(p.index);
        starLayer.appendChild(g);
      });
      // 辅星
      const minors = p.minorStars.slice(0, 6);
      minors.forEach((st, k) => {
        const a = am + (k - (minors.length - 1) / 2) * 6.4;
        const [x, y] = polar(C, C, R_MINOR, a);
        const fill = st.type === 'tough' ? '#1a56a8' : '#6e3da5';
        const g = starText(st.name, x, y, 15.5, fill, 'star-minor', st.mutagen);
        g.dataset.palace = String(p.index);
        starLayer.appendChild(g);
      });
      // 杂耀（前 5）
      const adj = p.adjectiveStars.slice(0, 5);
      adj.forEach((st, k) => {
        const a = am + (k - (adj.length - 1) / 2) * 5.4;
        const [x, y] = polar(C, C, R_ADJ, a);
        const g = starText(st.name, x, y, 12, '#6e6e66', 'star-adj');
        g.dataset.palace = String(p.index);
        starLayer.appendChild(g);
      });
      // 大限
      const [dx, dy] = polar(C, C, R_DEC, am);
      const decT = s('text', {
        x: dx, y: dy, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
        fill: '#228b22', 'font-size': 12.5, opacity: 0.9,
      });
      decT.textContent = `${p.decadal.range[0]}–${p.decadal.range[1]}`;
      decT.dataset.palace = String(p.index);
      starLayer.appendChild(decT);
    }

    // 中心信息盘（不随旋转）
    centerLayer.appendChild(s('circle', { cx: C, cy: C, r: 182, fill: 'url(#centerGrad)', stroke: '#c8a03a', 'stroke-width': 1, opacity: 0.98 }));
    const spinRing = s('circle', {
      cx: C, cy: C, r: 168, fill: 'none', stroke: '#6e3da5',
      'stroke-width': 0.8, 'stroke-dasharray': '2 8', opacity: 0.6, class: 'center-spin',
    });
    centerLayer.appendChild(spinRing);
    const soul = chart.palaces[chart.soulIndex];
    const soulStars = soul.majorStars.map((x) => x.name).join('·') || '空宫借星';
    const lines: [number, string, number, string, string?][] = [
      [418, `命宫${chart.soulBranch} · ${soulStars}`, 14, '#1a56a8'],
      [452, chart.archetype, 26, '#a83228', 'serif'],
      [484, chart.verse, 14.5, '#4a4a45'],
      [516, `${chart.solarDate} ${chart.timeName}`, 16, '#1a1a18'],
      [540, chart.lunarDate, 12.5, '#6e6e66'],
      [562, chart.ganzhi, 12.5, '#6e6e66'],
      [586, `${chart.fiveElements} · 命主${chart.soulMaster} 身主${chart.bodyMaster}`, 12, '#8b5a2b'],
      [608, `${chart.zodiac}年 · ${chart.sign} · ${chart.genderLabel}命`, 12, '#6e6e66'],
    ];
    for (const [y, text, size, fill, family] of lines) {
      let fs = size;
      if (family === 'serif') fs = Math.min(size, 330 / Math.max(6, text.length) * 1.05);
      const t = s('text', {
        x: C, y, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
        fill, 'font-size': fs, class: family === 'serif' ? 'center-archetype' : '',
      });
      t.textContent = text;
      centerLayer.appendChild(t);
    }
  }

  function flightArc(f: SiHuaFlight): SVGElement {
    const color = MUTAGEN_COLOR[f.mutagen];
    const g = s('g', { class: 'flight' });
    const aFrom = midAngle(f.fromIndex);
    const aTo = midAngle(f.toIndex);
    if (f.self || f.fromIndex === f.toIndex) {
      const [x, y] = polar(C, C, 300, aFrom);
      g.appendChild(s('circle', {
        cx: x, cy: y, r: 24, fill: 'none', stroke: color,
        'stroke-width': 2, 'stroke-dasharray': '5 7', class: 'flight-path',
      }));
    } else {
      let diff = aTo - aFrom;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      const aMid = aFrom + diff / 2;
      const [x0, y0] = polar(C, C, 300, aFrom);
      const [x1, y1] = polar(C, C, 300, aTo);
      const [cx, cy] = polar(C, C, 96, aMid);
      g.appendChild(s('path', {
        d: `M${x0.toFixed(1)} ${y0.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`,
        fill: 'none', stroke: color, 'stroke-width': 2.2,
        'stroke-dasharray': '7 9', class: 'flight-path', 'marker-end': `url(#arrow-${f.mutagen})`,
        opacity: 0.9,
      }));
      const lx = 0.25 * x0 + 0.5 * cx + 0.25 * x1;
      const ly = 0.25 * y0 + 0.5 * cy + 0.25 * y1;
      const label = s('text', {
        x: lx, y: ly, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
        fill: color, 'font-size': 14, 'font-weight': 600, class: 'flight-label',
        stroke: '#ffffff', 'stroke-width': 4, 'paint-order': 'stroke',
      });
      label.textContent = `${f.star}化${f.mutagen}`;
      g.appendChild(label);
    }
    return g;
  }

  function buildFlights(chart: Chart, selected: number | null): void {
    clear(flightLayer);
    const flights = selected !== null ? palaceFlights(chart, selected) : chart.natalFlights;
    for (const f of flights) flightLayer.appendChild(flightArc(f));
  }

  function buildSanfang(selected: number | null): void {
    clear(sanfangLayer);
    if (selected === null) return;
    const idx = surroundedIndices(selected);
    const pts = idx.map((i) => polar(C, C, 300, midAngle(i)));
    sanfangLayer.appendChild(s('polygon', {
      points: pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '),
      fill: 'rgba(26,86,168,0.05)', stroke: '#1a56a8',
      'stroke-width': 1.4, 'stroke-dasharray': '5 7', opacity: 0.7,
    }));
    for (const [x, y] of pts) {
      sanfangLayer.appendChild(s('circle', { cx: x, cy: y, r: 5, fill: '#1a56a8', opacity: 0.85 }));
    }
  }

  function renderEmpty(): void {
    const q = randomClassic();
    clear(empty);
    empty.appendChild(h('div', { class: 'compass-empty-inner' },
      h('p', { class: 'compass-empty-quote', text: `「${q.text}」` }),
      h('p', { class: 'muted', text: `${q.source} · ${q.hint}` }),
      h('a', { class: 'btn btn-primary', href: '#cast', text: '输入生辰，立即起盘' }),
    ));
  }
  renderEmpty();

  function update(st: AppState): void {
    const chart = st.chart;
    loading.style.display = st.status === 'computing' ? '' : 'none';
    empty.style.display = chart ? 'none' : '';
    svg.style.visibility = chart ? '' : 'hidden';
    if (!chart) return;

    if (chart.id !== builtId) {
      builtId = chart.id;
      flightKey = '';
      sanfangKey = '';
      buildChart(chart);
    }
    // 选中态
    const sectors = sectorLayer.querySelectorAll('.sector');
    sectors.forEach((el) => {
      const i = Number((el as SVGElement).dataset.index);
      el.classList.toggle('selected', i === st.selectedPalace);
    });
    rotor.classList.toggle('focused', st.focusDepth && st.selectedPalace !== null);
    // 聚焦景深：非选中宫的星曜一同淡出
    const focusOn = st.focusDepth && st.selectedPalace !== null;
    starLayer.querySelectorAll('[data-palace]').forEach((el) => {
      (el as SVGElement).style.opacity = focusOn && Number((el as SVGElement).dataset.palace) !== st.selectedPalace ? '0.26' : '';
    });
    // 图层开关
    gridLayer.style.display = st.showGrid ? '' : 'none';
    flightLayer.style.display = st.showFlights ? '' : 'none';
    sanfangLayer.style.display = st.showSanfang ? '' : 'none';
    // 飞星 / 三方四正按需重建
    const fk = `${chart.id}|${st.selectedPalace}|${st.showFlights}`;
    if (fk !== flightKey) { flightKey = fk; buildFlights(chart, st.selectedPalace); }
    const sk = `${chart.id}|${st.selectedPalace}|${st.showSanfang}`;
    if (sk !== sanfangKey) { sanfangKey = sk; buildSanfang(st.selectedPalace); }
    // 可视化参数
    svg.style.setProperty('--star-scale', String(st.starScale));
    svg.style.setProperty('--glow', String(st.glow));
  }

  update(getState());
  return {
    el: wrap,
    update,
    setAngle: (deg) => { angle = deg; },
    resetView: () => { angle = 0; },
  };
}