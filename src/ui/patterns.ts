/**
 * 格局判定面板：上格 / 中格 / 特殊格局卡片，点击涉及宫位可跳转罗盘选中。
 * 无格局时给出原创空态文案与古籍彩蛋。
 */
import { h, clear } from './dom';
import type { AppState } from '../services/store';
import { getState, setState } from '../services/store';
import { randomClassic } from '../content/classics';
import { sTap } from '../services/sound';

const GRADE_LABEL: Record<string, [string, string]> = {
  upper: ['上格', 'grade-upper'],
  middle: ['中格', 'grade-middle'],
  special: ['特殊', 'grade-special'],
};

export function mountPatterns(): { el: HTMLElement; update: (st: AppState) => void } {
  const list = h('div', { class: 'pattern-list' });
  const el = h('div', { class: 'patterns', id: 'patterns' },
    h('div', { class: 'patterns-head' },
      h('h3', { class: 'card-title', text: '格局判定' }),
      h('span', { class: 'patterns-count' }),
    ),
    list,
  );
  let builtId = '';

  function update(st: AppState): void {
    const chart = st.chart;
    const count = el.querySelector('.patterns-count') as HTMLElement;
    if (!chart) {
      el.style.display = 'none';
      return;
    }
    el.style.display = '';
    if (chart.id === builtId) return;
    builtId = chart.id;
    clear(list);
    count.textContent = `${chart.patterns.length} 项`;
    if (!chart.patterns.length) {
      const q = randomClassic(chart.solarDate.length + chart.soulIndex);
      list.appendChild(h('div', { class: 'pattern-empty' },
        h('p', { text: '此盘未入经典格局——星曜组合自有独特轨迹，不必拘泥古格。' }),
        h('p', { class: 'muted', text: `「${q.text}」 ${q.source}` }),
      ));
      return;
    }
    for (const p of chart.patterns) {
      const [label, cls] = GRADE_LABEL[p.grade];
      const card = h('article', { class: 'pattern-card' },
        h('div', { class: 'pattern-top' },
          h('h4', { class: 'pattern-name', text: p.name }),
          h('span', { class: `pattern-grade ${cls}`, text: label }),
        ),
        h('p', { class: 'pattern-summary', text: p.summary }),
        h('div', { class: 'pattern-tags' },
          p.stars.map((x) => h('span', { class: 'pattern-star', text: x })),
        ),
        h('div', { class: 'pattern-palaces' },
          p.palaces.map((name) => h('button', {
            type: 'button', class: 'pattern-palace-btn', text: name,
            onclick: () => {
              const idx = chart.palaces.find((x) => x.name === name)?.index;
              if (idx === undefined) return;
              sTap();
              setState({ selectedPalace: idx, selectedStar: null, drawerOpen: true, viewMode: 'compass' });
              document.getElementById('chart')?.scrollIntoView({ behavior: 'smooth' });
            },
          })),
        ),
      );
      list.appendChild(card);
    }
  }
  update(getState());
  return { el, update };
}