/**
 * 起盘表单：生辰输入 + 真太阳时/夏令时/闰月/晚子时/年分界口径 + 实时校正预览 + 历史记录。
 * 所有编辑即时写入单一状态源 store.input；提交触发 app 的排盘流程。
 */
import { h, clear } from './dom';
import type { BirthInput, ChartSummary } from '../engine/types';
import { CITIES, cityById } from '../engine/cities';
import { computeCorrection, solarToLunar, TIME_NAMES, TIME_RANGES, timeIndexFromHour, dstSpanOf } from '../engine/calendar';
import { getState, setState } from '../services/store';
import { listHistory, getChart, removeChart } from '../services/api';
import { sTap } from '../services/sound';

function patch(p: Partial<BirthInput>): void {
  setState({ input: { ...getState().input, ...p }, isSample: false });
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function mountForm(onSubmit: () => void): {
  el: HTMLElement; update: () => void; refreshHistory: () => void;
} {
  // ---- 控件 ----
  const calSolar = h('button', { type: 'button', class: 'seg-btn', text: '公历' });
  const calLunar = h('button', { type: 'button', class: 'seg-btn', text: '农历' });
  const yearIn = h('input', { type: 'number', class: 'field', min: 1900, max: 2100, 'aria-label': '出生年份' }) as HTMLInputElement;
  const monthIn = h('input', { type: 'number', class: 'field', min: 1, max: 12, 'aria-label': '出生月份' }) as HTMLInputElement;
  const dayIn = h('input', { type: 'number', class: 'field', min: 1, max: 31, 'aria-label': '出生日期' }) as HTMLInputElement;
  const hourSel = h('select', { class: 'field', 'aria-label': '出生小时' }) as HTMLSelectElement;
  for (let i = 0; i < 24; i++) {
    hourSel.appendChild(h('option', { value: i, text: `${pad(i)}:00–${pad(i)}:59 · ${TIME_NAMES[timeIndexFromHour(i)]}` }));
  }
  const minuteIn = h('input', { type: 'number', class: 'field', min: 0, max: 59, 'aria-label': '出生分钟' }) as HTMLInputElement;
  const maleBtn = h('button', { type: 'button', class: 'seg-btn', text: '男' });
  const femaleBtn = h('button', { type: 'button', class: 'seg-btn', text: '女' });

  const citySel = h('select', { class: 'field', 'aria-label': '出生地城市' }) as HTMLSelectElement;
  citySel.appendChild(h('option', { value: '', text: '— 选择出生地（可选）—' }));
  for (const c of CITIES) {
    citySel.appendChild(h('option', { value: c.id, text: `${c.name} · ${c.province}（东经 ${c.longitude}°）` }));
  }
  citySel.appendChild(h('option', { value: 'custom', text: '手动输入经度…' }));
  const lonIn = h('input', { type: 'number', class: 'field', step: 0.01, min: -180, max: 180, placeholder: '东经为正，如 116.41', 'aria-label': '出生地经度' }) as HTMLInputElement;

  const trueSolarTgl = toggle('真太阳时校正', '按出生地经度与均时差修正钟表时间');
  const dstTgl = toggle('夏令时回拨', '中国 1986–1991 年夏令时自动减 1 小时');
  const leapSel = select('闰月口径', [
    ['split', '十五分界：前半月归本月，后半月归下月'],
    ['current', '整月归本月（不拆分）'],
  ]);
  const ziSel = select('晚子时口径（23:00 后）', [
    ['forward', '算来日（子正换日）'],
    ['current', '算当日（子初换日）'],
  ]);
  const yearDivSel = select('年分界', [
    ['normal', '正月初一换年'],
    ['exact', '立春换年'],
  ]);
  const leapChk = h('label', { class: 'chk' },
    h('input', { type: 'checkbox' }), h('span', { text: '该农历月为闰月' }),
  ) as HTMLLabelElement;
  const leapChkInput = leapChk.querySelector('input')!;
  const nickIn = h('input', { type: 'text', class: 'field', maxlength: 16, placeholder: '星卡署名（可选，如「星旅人」）', 'aria-label': '昵称' }) as HTMLInputElement;

  const submitBtn = h('button', { type: 'submit', class: 'btn btn-primary btn-lg cast-submit' },
    h('span', { class: 'cast-submit-label', text: '立即起盘 · 查看命盘解析' }),
    h('span', { class: 'cast-submit-spin', 'aria-hidden': 'true' }),
  ) as HTMLButtonElement;
  const errBox = h('div', { class: 'cast-error', role: 'alert' });
  const previewBox = h('div', { class: 'cast-preview' });
  const historyBox = h('div', { class: 'history-list' });

  // ---- 事件 ----
  calSolar.addEventListener('click', () => { sTap(); patch({ calendar: 'solar' }); sync(); });
  calLunar.addEventListener('click', () => { sTap(); patch({ calendar: 'lunar' }); sync(); });
  maleBtn.addEventListener('click', () => { sTap(); patch({ gender: 'male' }); sync(); });
  femaleBtn.addEventListener('click', () => { sTap(); patch({ gender: 'female' }); sync(); });
  yearIn.addEventListener('input', () => { patch({ year: parseInt(yearIn.value, 10) || 0 }); preview(); });
  monthIn.addEventListener('input', () => { patch({ month: parseInt(monthIn.value, 10) || 0 }); preview(); });
  dayIn.addEventListener('input', () => { patch({ day: parseInt(dayIn.value, 10) || 0 }); preview(); });
  hourSel.addEventListener('change', () => { patch({ hour: parseInt(hourSel.value, 10) }); preview(); });
  minuteIn.addEventListener('input', () => { patch({ minute: parseInt(minuteIn.value, 10) || 0 }); preview(); });
  citySel.addEventListener('change', () => {
    sTap();
    if (citySel.value === 'custom') { patch({ birthplaceId: undefined }); }
    else if (citySel.value) {
      const c = cityById(citySel.value)!;
      patch({ birthplaceId: c.id, longitude: c.longitude });
    } else patch({ birthplaceId: undefined, longitude: undefined });
    sync();
  });
  lonIn.addEventListener('input', () => {
    const v = parseFloat(lonIn.value);
    patch({ longitude: Number.isFinite(v) ? v : undefined, birthplaceId: undefined });
    citySel.value = 'custom';
    preview();
  });
  trueSolarTgl.input.addEventListener('change', () => { sTap(); patch({ useTrueSolarTime: trueSolarTgl.input.checked }); preview(); });
  dstTgl.input.addEventListener('change', () => { sTap(); patch({ dstAdjust: dstTgl.input.checked }); preview(); });
  leapSel.addEventListener('change', () => { sTap(); patch({ leapPolicy: leapSel.value as BirthInput['leapPolicy'] }); });
  ziSel.addEventListener('change', () => { sTap(); patch({ ziHourPolicy: ziSel.value as BirthInput['ziHourPolicy'] }); });
  yearDivSel.addEventListener('change', () => { sTap(); patch({ yearDivide: yearDivSel.value as BirthInput['yearDivide'] }); });
  leapChkInput.addEventListener('change', () => { patch({ isLeapMonth: leapChkInput.checked }); preview(); });
  nickIn.addEventListener('input', () => patch({ nickname: nickIn.value }));

  const form = h('form', { class: 'cast-form', novalidate: true },
    h('div', { class: 'form-divider', text: '输入生辰八字' }),
    h('div', { class: 'form-row' },
      field('历法', h('div', { class: 'seg' }, calSolar, calLunar)),
      field('性别', h('div', { class: 'seg' }, maleBtn, femaleBtn)),
    ),
    h('div', { class: 'form-row form-date' },
      field('年', yearIn), field('月', monthIn), field('日', dayIn),
    ),
    h('div', { class: 'form-row' },
      field('时辰（小时）', hourSel), field('分钟', minuteIn),
    ),
    leapChk,
    h('div', { class: 'form-row' },
      field('出生地', citySel), field('经度（°E）', lonIn),
    ),
    h('div', { class: 'form-toggles' }, trueSolarTgl.el, dstTgl.el),
    h('details', { class: 'form-advanced' },
      h('summary', { text: '进阶口径（闰月 · 晚子时 · 年分界）' }),
      h('div', { class: 'form-advanced-body' },
        field('闰月口径', leapSel), field('晚子时口径', ziSel), field('年分界', yearDivSel),
      ),
    ),
    field('星卡署名', nickIn),
    errBox,
    submitBtn,
    h('p', { class: 'cast-hint', text: '所有计算在你的浏览器本地完成，生辰数据不会上传服务器。' }),
  );
  form.addEventListener('submit', (e) => { e.preventDefault(); onSubmit(); });

  const section = h('section', { class: 'section cast', id: 'cast' },
    h('div', { class: 'section-head' },
      h('span', { class: 'section-no', text: '01' }),
      h('h2', { class: 'section-title', text: '起盘 · 输入生辰八字' }),
      h('p', { class: 'section-sub', text: '公历农历皆可，真太阳时与夏令时自动校正，口径由你决定。' }),
    ),
    h('div', { class: 'cast-grid' },
      h('div', { class: 'card cast-card' }, form),
      h('div', { class: 'cast-side' },
        h('div', { class: 'card' },
          h('h3', { class: 'card-title', text: '实时校正预览' }),
          previewBox,
        ),
        h('div', { class: 'card' },
          h('div', { class: 'card-title-row' },
            h('h3', { class: 'card-title', text: '最近星盘' }),
            h('span', { class: 'history-count' }),
          ),
          historyBox,
        ),
      ),
    ),
  );

  // ---- 同步与预览 ----
  function sync(): void {
    const s = getState();
    const i = s.input;
    calSolar.classList.toggle('active', i.calendar === 'solar');
    calLunar.classList.toggle('active', i.calendar === 'lunar');
    maleBtn.classList.toggle('active', i.gender === 'male');
    femaleBtn.classList.toggle('active', i.gender === 'female');
    if (document.activeElement !== yearIn) yearIn.value = String(i.year || '');
    if (document.activeElement !== monthIn) monthIn.value = String(i.month || '');
    if (document.activeElement !== dayIn) dayIn.value = String(i.day || '');
    hourSel.value = String(i.hour);
    if (document.activeElement !== minuteIn) minuteIn.value = String(i.minute ?? 0);
    citySel.value = i.birthplaceId ?? (i.longitude !== undefined ? 'custom' : '');
    if (document.activeElement !== lonIn) lonIn.value = i.longitude !== undefined ? String(i.longitude) : '';
    trueSolarTgl.input.checked = i.useTrueSolarTime;
    dstTgl.input.checked = i.dstAdjust;
    leapSel.value = i.leapPolicy;
    ziSel.value = i.ziHourPolicy;
    yearDivSel.value = i.yearDivide;
    leapChkInput.checked = !!i.isLeapMonth;
    leapChk.style.display = i.calendar === 'lunar' ? '' : 'none';
    if (document.activeElement !== nickIn) nickIn.value = i.nickname ?? '';
    preview();
    markErrors();
  }

  function preview(): void {
    const i = getState().input;
    clear(previewBox);
    if (!i.year || !i.month || !i.day) {
      previewBox.appendChild(h('p', { class: 'muted', text: '填写完整出生日期后，这里会实时显示校正结果。' }));
      return;
    }
    try {
      const c = computeCorrection(i);
      const rows: [string, string][] = [
        ['排盘日期', c.correctedDate],
        ['校正时间', `${c.correctedClock}（${c.timeName} ${TIME_RANGES[c.timeIndex]}）`],
      ];
      if (i.calendar === 'solar') {
        try {
          const l = solarToLunar(i.year, i.month, i.day);
          rows.push(['农历', `${l.getYearInChinese()}年${l.getMonthInChinese()}月${l.getDayInChinese()}`]);
        } catch { /* 忽略边界 */ }
      }
      const span = dstSpanOf(i.year);
      if (span) rows.push(['夏令时区间', `${span[0]} ~ ${span[1]}${c.inDstSpan ? '（命中）' : ''}`]);
      for (const [k, v] of rows) {
        previewBox.appendChild(h('div', { class: 'preview-row' },
          h('span', { class: 'preview-k', text: k }), h('span', { class: 'preview-v', text: v }),
        ));
      }
      if (c.notes.length) {
        previewBox.appendChild(h('ul', { class: 'preview-notes' },
          c.notes.map((n) => h('li', { text: n })),
        ));
      }
    } catch {
      previewBox.appendChild(h('p', { class: 'muted', text: '当前日期无法转换，请检查输入（如农历三十是否存在）。' }));
    }
  }

  function markErrors(): void {
    const fields = getState().error?.fields ?? {};
    const map: Record<string, HTMLElement> = {
      year: yearIn, month: monthIn, day: dayIn, hour: hourSel, minute: minuteIn,
      gender: maleBtn, longitude: lonIn,
    };
    for (const [k, el] of Object.entries(map)) el.classList.toggle('invalid', !!fields[k]);
    const err = getState().error;
    const status = getState().status;
    if (status === 'error' && err) {
      errBox.style.display = 'block';
      clear(errBox);
      errBox.appendChild(h('strong', { text: `排盘失败（${err.code}）` }));
      errBox.appendChild(h('p', { text: err.message }));
      if (err.fields) {
        errBox.appendChild(h('ul', {}, Object.entries(err.fields).map(([k, v]) => h('li', { text: `${k}：${v}` }))));
      }
    } else {
      errBox.style.display = 'none';
    }
    submitBtn.classList.toggle('loading', status === 'computing');
    submitBtn.disabled = status === 'computing';
    (submitBtn.querySelector('.cast-submit-label') as HTMLElement).textContent =
      status === 'computing' ? '排盘推演中…' : '立即起盘 · 查看命盘解析';
  }

  async function refreshHistory(): Promise<void> {
    const r = await listHistory();
    const items = r.data ?? [];
    clear(historyBox);
    (section.querySelector('.history-count') as HTMLElement).textContent = `${items.length} / 24`;
    if (!items.length) {
      historyBox.appendChild(h('p', { class: 'muted', text: '还没有保存的命盘。起盘后会自动记录在这里（仅存于本机）。' }));
      return;
    }
    for (const it of items) historyBox.appendChild(historyItem(it));
  }

  function historyItem(it: ChartSummary): HTMLElement {
    const load = h('button', { type: 'button', class: 'btn btn-ghost btn-xs', text: '载入' });
    const del = h('button', { type: 'button', class: 'btn btn-danger-ghost btn-xs', text: '删除' });
    load.addEventListener('click', async () => {
      sTap();
      const r = await getChart(it.id);
      if (r.ok && r.data) {
        setState({ chart: r.data, input: { ...r.data.input }, status: 'ready', error: null, isSample: false, selectedPalace: null, selectedStar: null, drawerOpen: false, activeStage: 0 });
        document.getElementById('chart')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
    del.addEventListener('click', async () => {
      sTap();
      await removeChart(it.id);
      refreshHistory();
    });
    return h('div', { class: 'history-item' },
      h('div', { class: 'history-meta' },
        h('strong', { text: it.nickname || it.archetype }),
        h('span', { text: `${it.solarDate} ${it.genderLabel} · 命宫${it.soulBranch}` }),
      ),
      h('div', { class: 'history-actions' }, load, del),
    );
  }

  function update(): void { sync(); }
  sync();
  refreshHistory();
  return { el: section, update, refreshHistory };
}

// ---- 小组件 ----
function field(label: string, control: HTMLElement): HTMLElement {
  return h('label', { class: 'form-field' },
    h('span', { class: 'form-label', text: label }), control,
  );
}

function toggle(title: string, desc: string): { el: HTMLElement; input: HTMLInputElement } {
  const input = h('input', { type: 'checkbox' }) as HTMLInputElement;
  const el = h('label', { class: 'tgl' },
    input,
    h('span', { class: 'tgl-track', 'aria-hidden': 'true' }, h('span', { class: 'tgl-thumb' })),
    h('span', { class: 'tgl-text' }, h('strong', { text: title }), h('small', { text: desc })),
  );
  return { el, input };
}

function select(label: string, options: [string, string][]): HTMLSelectElement {
  const sel = h('select', { class: 'field', 'aria-label': label }) as HTMLSelectElement;
  for (const [v, t] of options) sel.appendChild(h('option', { value: v, text: t }));
  return sel;
}