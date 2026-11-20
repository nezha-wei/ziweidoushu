/**
 * 大限人生推演（差异化玩法层）。
 * 十二段大限时间轴 + 自动播放推演 + 阶段叙事 + 大限四化 + 罗盘定位联动。
 */
import { h, clear } from './dom';
import type { AppState } from '../services/store';
import { getState, setState } from '../services/store';
import { MUTAGEN_COLOR, MUTAGEN_ORDER } from '../engine/sihua';
import { sStage, sTap } from '../services/sound';

export function mountTimeline(): { el: HTMLElement; update: (st: AppState) => void } {
  const strip = h('div', { class: 'tl-strip', role: 'tablist', 'aria-label': '大限阶段' });
  const detail = h('div', { class: 'tl-detail' });
  const playBtn = h('button', { type: 'button', class: 'btn btn-primary btn-sm tl-play' });
  const prevBtn = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', text: '← 上一段' });
  const nextBtn = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', text: '下一段 →' });
  const progress = h('span', { class: 'tl-progress' });
  const lifeBar = h('div', { class: 'tl-lifebar' }, h('div', { class: 'tl-lifebar-fill' }), h('div', { class: 'tl-lifebar-marker' }));
  const emptyBox = h('div', { class: 'tl-empty' },
    h('p', { text: '起盘之后，这里将展开你的十二段大限人生。' }),
    h('a', { class: 'btn btn-ghost btn-sm', href: '#cast', text: '去起盘' }),
  );

  const el = h('section', { class: 'section timeline', id: 'timeline' },
    h('div', { class: 'section-head' },
      h('span', { class: 'section-no', text: '03' }),
      h('h2', { class: 'section-title', text: '大限推演 · 十二段人生剧本' }),
      h('p', { class: 'section-sub', text: '每十年换一宫，四化随之飞转。按下播放，看星曜如何推演你的人生节奏。' }),
    ),
    h('div', { class: 'tl-controls' }, prevBtn, playBtn, nextBtn, progress),
    lifeBar,
    strip,
    detail,
    emptyBox,
  );

  let playing = false;
  let timer = 0;
  let builtId = '';
  let detailKey = '';
  let lastStage = -1;

  function setPlaying(v: boolean): void {
    playing = v;
    window.clearInterval(timer);
    if (v) {
      timer = window.setInterval(() => {
        const st = getState();
        if (!st.chart || !st.chart.stages.length) { setPlaying(false); return; }
        const next = st.activeStage + 1;
        if (next >= st.chart.stages.length) { setPlaying(false); return; }
        sStage();
        setState({ activeStage: next });
      }, 4200);
    }
    renderPlayBtn();
  }

  function renderPlayBtn(): void {
    playBtn.textContent = playing ? '⏸ 暂停推演' : '▶ 播放人生推演';
    playBtn.classList.toggle('playing', playing);
  }

  playBtn.addEventListener('click', () => {
    sTap();
    const st = getState();
    if (!st.chart?.stages.length) return;
    if (!playing && st.activeStage >= st.chart.stages.length - 1) setState({ activeStage: 0 });
    setPlaying(!playing);
  });
  prevBtn.addEventListener('click', () => {
    const st = getState();
    if (!st.chart?.stages.length) return;
    sStage();
    setPlaying(false);
    setState({ activeStage: Math.max(0, st.activeStage - 1) });
  });
  nextBtn.addEventListener('click', () => {
    const st = getState();
    if (!st.chart?.stages.length) return;
    sStage();
    setPlaying(false);
    setState({ activeStage: Math.min(st.chart.stages.length - 1, st.activeStage + 1) });
  });

  function buildStrip(st: AppState): void {
    clear(strip);
    const stages = st.chart!.stages;
    stages.forEach((stage) => {
      const chip = h('button', {
        type: 'button', class: 'tl-chip', role: 'tab', dataset: { order: stage.order },
        'aria-label': `第${stage.order + 1}大限 ${stage.ageRange[0]}到${stage.ageRange[1]}岁`,
      },
        h('span', { class: 'tl-chip-age', text: `${stage.ageRange[0]}–${stage.ageRange[1]}岁` }),
        h('span', { class: 'tl-chip-palace', text: stage.palaceName }),
        h('span', { class: 'tl-chip-theme', text: stage.theme }),
      );
      chip.addEventListener('click', () => {
        sStage();
        setPlaying(false);
        setState({ activeStage: stage.order });
      });
      strip.appendChild(chip);
    });
  }

  function renderDetail(st: AppState): void {
    const chart = st.chart!;
    const stage = chart.stages[st.activeStage];
    if (!stage) return;
    const key = `${chart.id}|${st.activeStage}`;
    if (key === detailKey) return;
    const stageChanged = st.activeStage !== lastStage;
    lastStage = st.activeStage;
    detailKey = key;
    clear(detail);
    const mutagenChips = stage.mutagen.map((star, i) => {
      const m = MUTAGEN_ORDER[i];
      return h('span', { class: 'tl-mutagen', style: { borderColor: MUTAGEN_COLOR[m] } },
        h('b', { text: m, style: { background: MUTAGEN_COLOR[m] } }),
        h('span', { text: `${star}化${m}` }),
      );
    });
    const locateBtn = h('button', { type: 'button', class: 'btn btn-ghost btn-sm' }, '在罗盘中定位此宫 →');
    locateBtn.addEventListener('click', () => {
      sTap();
      setState({ viewMode: 'compass', selectedPalace: stage.palaceIndex, selectedStar: null, drawerOpen: true });
      document.getElementById('chart')?.scrollIntoView({ behavior: 'smooth' });
    });
    detail.appendChild(h('div', { class: 'tl-detail-card' },
      h('div', { class: 'tl-detail-left' },
        h('span', { class: 'tl-detail-order', text: `第 ${stage.order + 1} 大限` }),
        h('strong', { class: 'tl-detail-years', text: `${stage.yearRange[0]} – ${stage.yearRange[1]}` }),
        h('span', { class: 'tl-detail-age', text: `${stage.ageRange[0]}–${stage.ageRange[1]} 虚岁 · ${stage.stem}${stage.branch}限` }),
        h('span', { class: 'tl-detail-palace', text: `行限宫位：${stage.palaceName}（${chart.palaces[stage.palaceIndex].branch}）` }),
      ),
      h('div', { class: 'tl-detail-right' },
        h('div', { class: 'tl-detail-theme-row' },
          h('span', { class: 'tl-theme-badge', text: stage.theme }),
          locateBtn,
        ),
        h('p', { class: 'tl-narrative', text: stage.narrative }),
        h('div', { class: 'tl-mutagens' }, mutagenChips),
      ),
    ));
    // 人生进度条
    const fill = el.querySelector('.tl-lifebar-fill') as HTMLElement;
    const marker = el.querySelector('.tl-lifebar-marker') as HTMLElement;
    const pct = ((st.activeStage + 0.5) / chart.stages.length) * 100;
    fill.style.width = `${pct}%`;
    marker.style.left = `${pct}%`;
    marker.title = `${stage.ageRange[0]}–${stage.ageRange[1]} 岁`;
    // 选中 chip
    strip.querySelectorAll('.tl-chip').forEach((c) => {
      const active = Number((c as HTMLElement).dataset.order) === st.activeStage;
      c.classList.toggle('active', active);
      c.setAttribute('aria-selected', String(active));
      if (active && stageChanged) {
        // 仅在阶段变化时横向滚动条带，避免其它状态更新牵动页面
        const target = (c as HTMLElement).offsetLeft - strip.clientWidth / 2 + (c as HTMLElement).clientWidth / 2;
        strip.scrollTo({ left: target, behavior: 'smooth' });
      }
    });
    progress.textContent = `${st.activeStage + 1} / ${chart.stages.length} 段`;
  }

  function update(st: AppState): void {
    const has = !!st.chart && st.chart.stages.length > 0;
    emptyBox.style.display = has ? 'none' : '';
    strip.style.display = has ? '' : 'none';
    detail.style.display = has ? '' : 'none';
    lifeBar.style.display = has ? '' : 'none';
    (el.querySelector('.tl-controls') as HTMLElement).style.display = has ? '' : 'none';
    if (!has) { setPlaying(false); builtId = ''; return; }
    if (st.chart!.id !== builtId) {
      builtId = st.chart!.id;
      detailKey = '';
      setPlaying(false);
      buildStrip(st);
    }
    renderDetail(st);
    renderPlayBtn();
  }
  update(getState());
  return { el, update };
}