/**
 * 解读抽屉：宫位解读 / 星曜人格化释义 / 宫干飞星清单 / 三方四正导航。
 * 右侧滑入（移动端全宽），ESC 或遮罩点击关闭，关闭即清除选中态。
 */
import { h, clear } from './dom';
import type { AppState } from '../services/store';
import { getState, setState } from '../services/store';
import { starReading, palaceReading } from '../engine/interpret';
import { palaceFlights, surroundedIndices } from '../engine/ziwei';
import { MUTAGEN_COLOR, MUTAGEN_MEANING } from '../engine/sihua';
import { PALACES } from '../content/palaces';
import { sTap } from '../services/sound';

function closeDrawer(): void {
  setState({ drawerOpen: false, selectedPalace: null, selectedStar: null });
}

export function mountDrawer(): { el: HTMLElement; update: (st: AppState) => void } {
  const body = h('div', { class: 'drawer-body' });
  const titleEl = h('h3', { class: 'drawer-title' });
  const subEl = h('p', { class: 'drawer-sub' });
  const closeBtn = h('button', { type: 'button', class: 'drawer-close', 'aria-label': '关闭解读', text: '✕' });
  closeBtn.addEventListener('click', () => { sTap(); closeDrawer(); });

  const panel = h('aside', { class: 'drawer', role: 'dialog', 'aria-label': '命盘解读', 'aria-modal': 'false' },
    h('div', { class: 'drawer-head' },
      h('div', {}, titleEl, subEl),
      closeBtn,
    ),
    body,
    h('p', { class: 'drawer-foot', text: '解读为原创娱乐化表述，仅供文化体验，不构成任何决策建议。' }),
  );
  const backdrop = h('div', { class: 'drawer-backdrop' });
  backdrop.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && getState().drawerOpen) closeDrawer();
  });
  const el = h('div', { class: 'drawer-root' }, backdrop, panel);

  let contentKey = '';

  function starChip(name: string, mutagen?: string): HTMLElement {
    const chip = h('button', { type: 'button', class: 'drawer-star-chip' }, name);
    if (mutagen) {
      chip.appendChild(h('b', { text: mutagen, style: { background: MUTAGEN_COLOR[mutagen as keyof typeof MUTAGEN_COLOR] } }));
    }
    chip.addEventListener('click', () => {
      setState({ selectedStar: name, selectedPalace: null });
    });
    return chip;
  }

  function buildStar(st: AppState): void {
    const chart = st.chart!;
    const name = st.selectedStar!;
    let found: { palace: string; brightness: string; mutagen?: string } | null = null;
    for (const p of chart.palaces) {
      const s = [...p.majorStars, ...p.minorStars, ...p.adjectiveStars].find((x) => x.name === name);
      if (s) { found = { palace: p.name, brightness: s.brightness, mutagen: s.mutagen }; break; }
    }
    const reading = starReading({
      name, type: 'major', scope: 'origin',
      brightness: (found?.brightness ?? '') as any, mutagen: found?.mutagen as any,
    });
    titleEl.textContent = reading.title;
    subEl.textContent = found ? `落 ${found.palace}${found.brightness ? ` · 亮度「${found.brightness}」` : ''}` : '星曜释义';
    clear(body);
    for (const para of reading.body) body.appendChild(h('p', { class: 'drawer-para', text: para }));
    if (found) {
      const p = chart.palaces.find((x) => x.name === found!.palace)!;
      body.appendChild(h('button', {
        type: 'button', class: 'btn btn-ghost btn-sm', text: `查看所在宫位 · ${p.name} →`,
        onclick: () => setState({ selectedStar: null, selectedPalace: p.index }),
      }));
    }
  }

  function buildPalace(st: AppState): void {
    const chart = st.chart!;
    const p = chart.palaces[st.selectedPalace!];
    const meta = PALACES[p.name];
    titleEl.textContent = `${p.name} · ${p.stem}${p.branch}`;
    subEl.textContent = `${meta.domain} —— ${meta.question}`;
    clear(body);

    const paras = palaceReading(chart, p);
    for (const para of paras) body.appendChild(h('p', { class: 'drawer-para', text: para }));

    // 宫内星曜
    const all = [...p.majorStars, ...p.minorStars, ...p.adjectiveStars];
    if (all.length) {
      body.appendChild(h('h4', { class: 'drawer-h4', text: '宫内星曜（点击查看）' }));
      body.appendChild(h('div', { class: 'drawer-chips' },
        all.map((s) => starChip(s.name, s.mutagen)),
      ));
    }

    // 宫干飞四化
    const flights = palaceFlights(chart, p.index);
    if (flights.length) {
      body.appendChild(h('h4', { class: 'drawer-h4', text: `${p.stem}干飞四化` }));
      const list = h('div', { class: 'drawer-flights' });
      for (const f of flights) {
        const target = chart.palaces[f.toIndex];
        list.appendChild(h('button', {
          type: 'button', class: 'drawer-flight',
          onclick: () => setState({ selectedPalace: f.toIndex, selectedStar: null }),
        },
          h('b', { class: 'drawer-flight-m', text: f.mutagen, style: { background: MUTAGEN_COLOR[f.mutagen] } }),
          h('span', { text: `${f.star}化${f.mutagen} → ${f.self ? '本宫自化' : target.name}` }),
        ));
      }
      body.appendChild(list);
      body.appendChild(h('p', { class: 'drawer-note', text: MUTAGEN_MEANING['禄'].desc }));
    }

    // 三方四正
    const sur = surroundedIndices(p.index).map((i) => chart.palaces[i]);
    body.appendChild(h('h4', { class: 'drawer-h4', text: '三方四正' }));
    body.appendChild(h('div', { class: 'drawer-chips' },
      sur.map((x) => h('button', {
        type: 'button', class: 'drawer-star-chip', text: `${x.name}（${x.branch}）`,
        onclick: () => setState({ selectedPalace: x.index, selectedStar: null }),
      })),
    ));
  }

  function update(st: AppState): void {
    const open = st.drawerOpen && !!st.chart && (st.selectedPalace !== null || st.selectedStar !== null);
    el.classList.toggle('open', open);
    document.body.classList.toggle('drawer-open', open);
    if (!open) { contentKey = ''; return; }
    const key = `${st.chart!.id}|${st.selectedPalace}|${st.selectedStar}`;
    if (key === contentKey) return;
    contentKey = key;
    if (st.selectedStar) buildStar(st);
    else buildPalace(st);
    body.scrollTop = 0;
  }
  update(getState());
  return { el, update };
}