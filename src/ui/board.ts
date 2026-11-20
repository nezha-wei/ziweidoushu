/**
 * 传统方盘视图（4×4 宫格，中心 2×2 为命盘摘要）。
 * 与罗盘共享选中态；点击宫位 / 星曜同样打开解读抽屉。
 */
import { h, clear } from './dom';
import type { AppState } from '../services/store';
import { getState, setState } from '../services/store';
import type { Chart, PalaceInfo, StarInfo } from '../engine/types';
import { MUTAGEN_COLOR } from '../engine/sihua';
import { sSelect } from '../services/sound';

/** 地支 → 方盘行列（寅起索引 0） */
const CELL_POS: Record<number, [number, number]> = {
  3: [0, 0], 4: [0, 1], 5: [0, 2], 6: [0, 3],
  2: [1, 0], 7: [1, 3],
  1: [2, 0], 8: [2, 3],
  0: [3, 0], 11: [3, 1], 10: [3, 2], 9: [3, 3],
};

export function mountBoard(): { el: HTMLElement; update: (st: AppState) => void } {
  const grid = h('div', { class: 'board-grid' });
  const el = h('div', { class: 'board-wrap' }, grid);
  let builtId = '';

  function starChip(st: StarInfo, major: boolean): HTMLElement {
    const chip = h('button', {
      type: 'button',
      class: `board-star ${major ? 'major' : 'minor'} ${st.type === 'tough' ? 'tough' : ''}`,
    }, st.name);
    if (st.brightness) chip.appendChild(h('i', { class: 'board-bright', text: st.brightness }));
    if (st.mutagen) {
      chip.appendChild(h('b', {
        class: 'board-mutagen', text: st.mutagen,
        style: { background: MUTAGEN_COLOR[st.mutagen] },
      }));
    }
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      sSelect();
      setState({ selectedStar: st.name, selectedPalace: null, drawerOpen: true });
    });
    return chip;
  }

  function cell(p: PalaceInfo): HTMLElement {
    const c = h('div', {
      class: `board-cell${p.isSoul ? ' soul' : ''}${p.isBody ? ' body' : ''}`,
      dataset: { index: p.index },
    },
      h('div', { class: 'board-cell-head' },
        h('span', { class: 'board-palace', text: p.name }),
        h('span', { class: 'board-ganzhi', text: `${p.stem}${p.branch}` }),
        p.isSoul ? h('b', { class: 'board-tag soul', text: '命' }) : null,
        p.isBody ? h('b', { class: 'board-tag body', text: '身' }) : null,
        p.isOriginal ? h('b', { class: 'board-tag origin', text: '因' }) : null,
      ),
      h('div', { class: 'board-stars' },
        p.majorStars.map((st) => starChip(st, true)),
        p.minorStars.slice(0, 6).map((st) => starChip(st, false)),
      ),
      h('div', { class: 'board-cell-foot' },
        h('span', { text: `大限 ${p.decadal.range[0]}–${p.decadal.range[1]}` }),
        h('span', { class: 'board-adj', text: p.adjectiveStars.slice(0, 4).map((x) => x.name).join(' ') }),
      ),
    );
    c.addEventListener('click', () => {
      sSelect();
      setState({ selectedPalace: p.index, selectedStar: null, drawerOpen: true });
    });
    return c;
  }

  function build(chart: Chart): void {
    clear(grid);
    const cells: (HTMLElement | null)[][] = Array.from({ length: 4 }, () => Array(4).fill(null));
    for (const p of chart.palaces) {
      const [r, c] = CELL_POS[p.index];
      cells[r][c] = cell(p);
    }
    const center = h('div', { class: 'board-center' },
      h('h4', { class: 'board-center-title', text: chart.archetype }),
      h('p', { class: 'board-center-verse', text: chart.verse }),
      h('dl', { class: 'board-center-meta' },
        meta('公历', `${chart.solarDate} ${chart.timeName}`),
        meta('农历', chart.lunarDate),
        meta('干支', chart.ganzhi),
        meta('五行局', chart.fiveElements),
        meta('命主 / 身主', `${chart.soulMaster} / ${chart.bodyMaster}`),
        meta('生肖 / 星座', `${chart.zodiac} / ${chart.sign}`),
      ),
      h('div', { class: 'board-center-muts' },
        chart.natalFlights.map((f) => h('span', { class: 'board-center-mut' },
          h('b', { text: f.mutagen, style: { background: MUTAGEN_COLOR[f.mutagen] } }),
          `${f.star}化${f.mutagen}`,
        )),
      ),
      h('p', {
        class: 'board-center-note',
        text: `校正后排盘时间 ${chart.correction.correctedDate} ${chart.correction.correctedClock}（真太阳时${chart.correction.trueSolarApplied ? '已启用' : '未启用'}）`,
      }),
    );
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (r >= 1 && r <= 2 && c >= 1 && c <= 2) {
          if (r === 1 && c === 1) grid.appendChild(center);
          continue;
        }
        grid.appendChild(cells[r][c]!);
      }
    }
  }

  function meta(k: string, v: string): HTMLElement {
    return h('div', { class: 'board-meta-row' }, h('dt', { text: k }), h('dd', { text: v }));
  }

  function update(st: AppState): void {
    if (!st.chart || st.viewMode !== 'board') { el.style.display = 'none'; return; }
    el.style.display = '';
    if (st.chart.id !== builtId) { builtId = st.chart.id; build(st.chart); }
    grid.querySelectorAll('.board-cell').forEach((c) => {
      c.classList.toggle('selected', Number((c as HTMLElement).dataset.index) === st.selectedPalace);
    });
  }
  update(getState());
  return { el, update };
}