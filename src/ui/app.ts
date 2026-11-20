/**
 * 应用编排：挂载各分区、订阅单一状态源做 diff 更新、驱动排盘主流程。
 * 主流程：输入 → 排盘（加载动画）→ 罗盘/方盘交互探索 → 大限推演 → 星卡导出。
 */
import { h, clear } from './dom';
import { getState, setState, subscribe } from '../services/store';
import type { AppState } from '../services/store';
import * as api from '../services/api';
import { unlockAudio, sCompute, sError } from '../services/sound';
import { mountStarfield } from './starfield';
import { mountNav } from './nav';
import { mountHero } from './hero';
import { mountForm } from './form';
import { mountCompass } from './compass';
import { mountControls } from './controls';
import { mountBoard } from './board';
import { mountPatterns } from './patterns';
import { mountDrawer } from './drawer';
import { mountTimeline } from './timeline';
import { mountShare } from './share';
import { mountAbout } from './about';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function mountApp(root: HTMLElement): void {
  // 背景星空
  const sky = h('canvas', { class: 'starfield', 'aria-hidden': 'true' }) as HTMLCanvasElement;
  document.body.prepend(sky);
  mountStarfield(sky);
  unlockAudio();

  const nav = mountNav();
  const hero = mountHero();
  const compass = mountCompass();
  const controls = mountControls(compass.resetView, compass.setAngle);
  const board = mountBoard();
  const patterns = mountPatterns();
  const drawer = mountDrawer();
  const timeline = mountTimeline();
  const share = mountShare();
  const about = mountAbout();

  // 命盘分区骨架：split workspace（左盘右解读栏）
  const metaRow = h('div', { class: 'chart-meta' });
  const correctionBox = h('details', { class: 'chart-correction' },
    h('summary', { text: '历法校正明细（真太阳时 / 夏令时）' }),
    h('div', { class: 'chart-correction-body' }),
  );
  // 视图 pill：星象罗盘 / 传统方盘
  const tabCompass = h('button', { type: 'button', class: 'tab-item', text: '星象罗盘' });
  const tabBoard = h('button', { type: 'button', class: 'tab-item', text: '传统方盘' });
  tabCompass.addEventListener('click', () => setState({ viewMode: 'compass' }));
  tabBoard.addEventListener('click', () => setState({ viewMode: 'board' }));
  const viewTabs = h('div', { class: 'tab-container', role: 'tablist', 'aria-label': '命盘视图切换' }, tabCompass, tabBoard);
  const stageArea = h('div', { class: 'chart-stage' }, compass.el, board.el);
  const insightCard = h('div', { class: 'card chart-insight' },
    h('h3', { class: 'card-title', text: '命盘档案' }),
    metaRow,
    correctionBox,
  );
  const chartSection = h('section', { class: 'section chart', id: 'chart' },
    h('div', { class: 'section-head' },
      h('span', { class: 'section-no', text: '02' }),
      h('h2', { class: 'section-title', text: '命盘 · 十二宫与四化飞星' }),
      h('p', { class: 'section-sub', text: '点击宫位与星曜查看解读，宫干飞四化沿星盘流动；控制台实时调节罗盘。' }),
    ),
    h('div', { class: 'chart-workspace' },
      h('div', { class: 'chart-workspace-left' }, viewTabs, stageArea),
      h('div', { class: 'chart-workspace-right' }, insightCard, controls.el),
    ),
    patterns.el,
  );

  const form = mountForm(() => runCompute(true));

  root.append(hero.el, form.el, chartSection, timeline.el, share.el, about.el);
  document.body.append(drawer.el);

  // ---- 命盘元信息 ----
  let metaId = '';
  function updateMeta(st: AppState): void {
    const chart = st.chart;
    if (!chart) {
      metaRow.style.display = 'none';
      correctionBox.style.display = 'none';
      metaId = '';
      return;
    }
    metaRow.style.display = '';
    correctionBox.style.display = '';
    if (chart.id === metaId) return;
    metaId = chart.id;
    clear(metaRow);
    const chips: [string, string][] = [
      ['公历', `${chart.solarDate} ${chart.timeName}`],
      ['农历', chart.lunarDate],
      ['干支', chart.ganzhi],
      ['时辰', `${chart.timeName} ${chart.timeRange}`],
      ['生肖', chart.zodiac],
      ['星座', chart.sign],
      ['五行局', chart.fiveElements],
      ['命主 / 身主', `${chart.soulMaster} / ${chart.bodyMaster}`],
      ['命宫 / 身宫', `${chart.soulBranch} / ${chart.bodyBranch}`],
    ];
    for (const [k, v] of chips) {
      metaRow.appendChild(h('span', { class: 'meta-chip' },
        h('i', { text: k }), h('b', { text: v }),
      ));
    }
    metaRow.appendChild(h('span', { class: 'meta-chip meta-source' },
      h('i', { text: '数据源' }), h('b', { text: '本地计算' }),
    ));
    const body = correctionBox.querySelector('.chart-correction-body') as HTMLElement;
    clear(body);
    const c = chart.correction;
    const rows: [string, string][] = [
      ['真太阳时', c.trueSolarApplied ? '已启用' : '未启用'],
      ['经度时差', `${c.longitudeOffsetMin} 分钟`],
      ['均时差', `${c.equationOfTimeMin} 分钟`],
      ['夏令时回拨', `${c.dstOffsetMin} 分钟${c.inDstSpan ? '（命中夏令时区间）' : ''}`],
      ['校正后', `${c.correctedDate} ${c.correctedClock}（${c.timeName}）`],
    ];
    for (const [k, v] of rows) {
      body.appendChild(h('div', { class: 'preview-row' },
        h('span', { class: 'preview-k', text: k }), h('span', { class: 'preview-v', text: v }),
      ));
    }
    if (c.notes.length) {
      body.appendChild(h('ul', { class: 'preview-notes' }, c.notes.map((n) => h('li', { text: n }))));
    }
  }

  // ---- 视图切换 ----
  function updateView(st: AppState): void {
    compass.el.style.display = st.viewMode === 'compass' ? '' : 'none';
    board.el.style.display = st.viewMode === 'board' && st.chart ? '' : 'none';
    tabCompass.classList.toggle('active', st.viewMode === 'compass');
    tabBoard.classList.toggle('active', st.viewMode === 'board');
    tabCompass.setAttribute('aria-selected', String(st.viewMode === 'compass'));
    tabBoard.setAttribute('aria-selected', String(st.viewMode === 'board'));
  }

  // ---- 排盘主流程 ----
  let computing = false;
  async function runCompute(scrollToChart: boolean): Promise<void> {
    if (computing) return;
    computing = true;
    const input = getState().input;
    setState({ status: 'computing', error: null });
    const started = performance.now();
    const r = await api.compute(input);
    const elapsed = performance.now() - started;
    if (elapsed < 700) await delay(700 - elapsed); // 保证加载动画可感知
    computing = false;
    if (r.ok && r.data) {
      setState({
        chart: r.data, status: 'ready', error: null,
        selectedPalace: null, selectedStar: null, drawerOpen: false, activeStage: 0,
      });
      sCompute();
      api.saveChart(r.data).then(() => { form.refreshHistory(); hero.refreshCta(); });
      if (scrollToChart) {
        document.getElementById('chart')?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      setState({ status: 'error', error: r.error ?? { code: 'INTERNAL', message: '未知错误，请重试。' } });
      sError();
    }
  }

  // ---- 订阅：单一状态源驱动全部区域 ----
  subscribe((st) => {
    hero.update();
    form.update();
    updateMeta(st);
    updateView(st);
    compass.update(st);
    controls.update(st);
    board.update(st);
    patterns.update(st);
    drawer.update(st);
    timeline.update(st);
    share.update(st);
  });
  const st0 = getState();
  updateMeta(st0);
  updateView(st0);

  // ---- 滚动入场（无 IntersectionObserver 时优雅降级为直接显示） ----
  const revealEls = document.querySelectorAll('.section-head, .card, .classics, .poster-card');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }
    }, { threshold: 0.12 });
    revealEls.forEach((el) => {
      el.classList.add('reveal');
      io.observe(el);
    });
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  // 首屏即有真实内容：静默加载示例盘
  runCompute(false);
}