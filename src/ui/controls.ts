/**
 * 罗盘永久可见控制区（11 件实时调节工具）。
 * 所有改动即时写入 store 并作用于罗盘，无设置弹窗。
 */
import { h } from './dom';
import { getState, setState } from '../services/store';
import type { AppState } from '../services/store';
import { sTap } from '../services/sound';

export function mountControls(resetView: () => void, setAngle: (deg: number) => void): {
  el: HTMLElement; update: (st: AppState) => void;
} {
  // 视图切换
  const compassBtn = h('button', { type: 'button', class: 'seg-btn', text: '星象罗盘' });
  const boardBtn = h('button', { type: 'button', class: 'seg-btn', text: '传统方盘' });
  compassBtn.addEventListener('click', () => { sTap(); setState({ viewMode: 'compass' }); });
  boardBtn.addEventListener('click', () => { sTap(); setState({ viewMode: 'board' }); });

  const autoTgl = miniToggle('自动旋转', (v) => setState({ autoRotate: v }));
  const flightsTgl = miniToggle('四化飞星', (v) => setState({ showFlights: v }));
  const sanfangTgl = miniToggle('三方四正', (v) => setState({ showSanfang: v }));
  const gridTgl = miniToggle('刻度网格', (v) => setState({ showGrid: v }));
  const focusTgl = miniToggle('聚焦景深', (v) => setState({ focusDepth: v }));

  const speed = slider('旋转速度', 0, 2, 0.1, (v) => setState({ rotateSpeed: v }));
  const scale = slider('星曜大小', 0.6, 1.6, 0.05, (v) => setState({ starScale: v }));
  const glow = slider('光晕强度', 0, 1.5, 0.05, (v) => setState({ glow: v }));
  const manual = slider('手动方位', 0, 360, 1, (v) => setAngle(v), '°');

  const resetBtn = h('button', { type: 'button', class: 'btn btn-ghost btn-sm ctrl-reset' }, '重置视角与参数');
  resetBtn.addEventListener('click', () => {
    sTap();
    resetView();
    setState({
      autoRotate: !getState().reducedMotion, rotateSpeed: 0.5, starScale: 1, glow: 1,
      showFlights: true, showSanfang: true, showGrid: true, focusDepth: true,
    });
  });

  const el = h('aside', { class: 'card ctrl-panel', 'aria-label': '罗盘控制区' },
    h('h3', { class: 'card-title', text: '罗盘控制台' }),
    h('p', { class: 'ctrl-hint', text: '拖动罗盘或调节下方参数，即时生效。' }),
    h('div', { class: 'ctrl-group' },
      h('span', { class: 'ctrl-label', text: '视图' }),
      h('div', { class: 'seg seg-block' }, compassBtn, boardBtn),
    ),
    h('div', { class: 'ctrl-group ctrl-toggles' },
      autoTgl.el, flightsTgl.el, sanfangTgl.el, gridTgl.el, focusTgl.el,
    ),
    speed.el, scale.el, glow.el, manual.el,
    resetBtn,
    h('p', { class: 'ctrl-tip' },
      h('strong', { text: '玩法提示：' }),
      '点击宫位看解读与宫干飞星；点击星曜看人格化释义；开启「聚焦景深」让选中宫位从命盘中浮出。',
    ),
  );

  function update(st: AppState): void {
    compassBtn.classList.toggle('active', st.viewMode === 'compass');
    boardBtn.classList.toggle('active', st.viewMode === 'board');
    autoTgl.input.checked = st.autoRotate;
    flightsTgl.input.checked = st.showFlights;
    sanfangTgl.input.checked = st.showSanfang;
    gridTgl.input.checked = st.showGrid;
    focusTgl.input.checked = st.focusDepth;
    speed.sync(st.rotateSpeed);
    scale.sync(st.starScale);
    glow.sync(st.glow);
  }
  update(getState());
  return { el, update };
}

function miniToggle(label: string, onChange: (v: boolean) => void): { el: HTMLElement; input: HTMLInputElement } {
  const input = h('input', { type: 'checkbox' }) as HTMLInputElement;
  input.addEventListener('change', () => { sTap(); onChange(input.checked); });
  const el = h('label', { class: 'mini-tgl' },
    input,
    h('span', { class: 'mini-tgl-track', 'aria-hidden': 'true' }),
    h('span', { text: label }),
  );
  return { el, input };
}

function slider(
  label: string, min: number, max: number, step: number,
  onInput: (v: number) => void, unit = '',
): { el: HTMLElement; sync: (v: number) => void } {
  const val = h('span', { class: 'ctrl-val' });
  const input = h('input', {
    type: 'range', class: 'ctrl-range', min, max, step, 'aria-label': label,
  }) as HTMLInputElement;
  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    val.textContent = `${v}${unit}`;
    onInput(v);
  });
  const el = h('div', { class: 'ctrl-group' },
    h('div', { class: 'ctrl-label-row' },
      h('span', { class: 'ctrl-label', text: label }), val,
    ),
    input,
  );
  function sync(v: number): void {
    if (document.activeElement !== input) input.value = String(v);
    val.textContent = `${parseFloat(input.value)}${unit}`;
  }
  return { el, sync };
}