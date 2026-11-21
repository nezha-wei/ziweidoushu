/**
 * 人格化星卡（分享 / 导出层）。
 * Canvas 绘制 1080×1440 星卡：奶金纸底 + 金墨浮尘 + 原型标题 + 诗句 + 五维雷达 + 人格摘要 + 朱砂印章。
 * 支持 PNG 下载与判词复制；默认隐藏生辰，昵称与隐私选项即时重绘。
 */
import { h } from './dom';
import type { AppState } from '../services/store';
import { getState, setState } from '../services/store';
import type { Chart } from '../engine/types';
import { METRIC_LABELS } from '../engine/metrics';
import { quickReading } from '../engine/interpret';
import { sExport, sTap } from '../services/sound';

const W = 1080, H = 1440;

function hashStr(str: string): number {
  let x = 0;
  for (let i = 0; i < str.length; i++) x = (x * 31 + str.charCodeAt(i)) >>> 0;
  return x;
}

function mulberry(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SERIF = '"Noto Serif SC", "Songti SC", "STSong", "SimSun", serif';
const SANS = '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif';

function fitFont(ctx: CanvasRenderingContext2D, text: string, width: number, size: number, family: string, weight = 400): void {
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > width && size > 16) {
    size -= 1;
    ctx.font = `${weight} ${size}px ${family}`;
  }
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, width: number): string {
  if (ctx.measureText(text).width <= width) return text;
  const chars = Array.from(text);
  while (chars.length && ctx.measureText(`${chars.join('')}…`).width > width) chars.pop();
  return `${chars.join('')}…`;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const char of text) {
    if (line && ctx.measureText(line + char).width > width && lines.length < maxLines - 1) {
      lines.push(line);
      line = char;
    } else {
      line += char;
    }
  }
  lines.push(ellipsize(ctx, line, width));
  return lines;
}

// 预览、导出与复制共用同一份摘要；隐私模式不读取生辰字段。
function summaryRows(chart: Chart, hideBirth: boolean): [string, string][] {
  if (hideBirth) {
    const { summary, tags } = quickReading(chart);
    return [
      ['关键词', tags.join(' · ')],
      ['人格', summary],
      ['趣味', '星盘灵感，仅供娱乐参考，不是人生定论。'],
      ['分享', '已隐藏生辰信息，署名仍保留。'],
    ];
  }
  const soul = chart.palaces[chart.soulIndex];
  const soulStars = soul.majorStars.map((s) => s.name + (s.brightness ? `(${s.brightness})` : '')).join(' · ') || '空宫借对宫主星';
  return [
    ['出生', `${chart.solarDate} ${chart.timeName} · ${chart.genderLabel}命`],
    ['农历', chart.lunarDate],
    ['干支', chart.ganzhi],
    ['命宫', `${chart.soulBranch}宫 · ${soulStars}`],
    ['五行局', `${chart.fiveElements} · 命主${chart.soulMaster} · 身主${chart.bodyMaster}`],
    ['格局', chart.patterns.length ? chart.patterns.map((p) => p.name).join('、') : '不入古格，自有轨迹'],
  ];
}

export function drawCard(canvas: HTMLCanvasElement, chart: Chart, nickname: string, hideBirth = true): void {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const rnd = mulberry(hashStr(chart.id));

  // 背景：奶金纸感渐变
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#fbf7ec');
  bg.addColorStop(0.5, '#f3ead6');
  bg.addColorStop(1, '#ece1c8');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // 光晕（金 / 朱砂）
  const glow1 = ctx.createRadialGradient(W * 0.82, H * 0.16, 0, W * 0.82, H * 0.16, 460);
  glow1.addColorStop(0, 'rgba(200,160,58,0.22)');
  glow1.addColorStop(1, 'rgba(200,160,58,0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, W, H);
  const glow2 = ctx.createRadialGradient(W * 0.12, H * 0.72, 0, W * 0.12, H * 0.72, 520);
  glow2.addColorStop(0, 'rgba(168,50,40,0.10)');
  glow2.addColorStop(1, 'rgba(168,50,40,0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);
  // 金墨浮尘（确定性，浅底可见）
  for (let i = 0; i < 150; i++) {
    const x = rnd() * W, y = rnd() * H, r = rnd() * 2 + 0.4;
    const hues = [40, 8, 265, 215];
    ctx.fillStyle = `hsla(${hues[Math.floor(rnd() * 4)]}, 45%, ${35 + rnd() * 20}%, ${0.1 + rnd() * 0.22})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // 装饰罗盘环（右上）
  ctx.save();
  ctx.translate(W - 170, 190);
  ctx.strokeStyle = 'rgba(200,160,58,0.75)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 0, 120, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(110,61,165,0.55)';
  ctx.setLineDash([3, 9]);
  ctx.beginPath(); ctx.arc(0, 0, 92, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  for (let i = 0; i < 24; i++) {
    const a = (i * 15 * Math.PI) / 180;
    ctx.strokeStyle = i % 2 ? 'rgba(110,110,102,0.45)' : 'rgba(200,160,58,0.7)';
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 112, Math.sin(a) * 112);
    ctx.lineTo(Math.cos(a) * 120, Math.sin(a) * 120);
    ctx.stroke();
  }
  ctx.fillStyle = '#a83228';
  ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // 顶部品牌
  ctx.fillStyle = '#1a1a18';
  ctx.font = `700 30px ${SERIF}`;
  ctx.textAlign = 'left';
  ctx.fillText('紫微斗数', 72, 110);
  ctx.fillStyle = '#6e6e66';
  ctx.font = `400 20px ${SANS}`;
  ctx.fillText('ZIWEI DOUSHU · 人生星盘推演', 72, 146);
  ctx.strokeStyle = 'rgba(139,90,43,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(72, 176); ctx.lineTo(W - 72, 176); ctx.stroke();

  // 署名避开右上罗盘；长昵称、原型和诗句按可用宽度缩小。
  const signature = `${nickname || '星旅人'} 的命盘`;
  const signatureWidth = W - 144 - 240;
  ctx.fillStyle = '#1a1a18';
  fitFont(ctx, signature, signatureWidth, 40, SANS);
  ctx.fillText(signature, 72, 260, signatureWidth);
  fitFont(ctx, chart.archetype, W - 144, 78, SERIF, 700);
  ctx.fillStyle = '#a83228';
  ctx.fillText(chart.archetype, 72, 390, W - 144);
  // 固定基线，防止长标题缩小后与装饰罗盘重叠。
  const verse = `「${chart.verse}」`;
  ctx.fillStyle = '#4a4a45';
  fitFont(ctx, verse, W - 144, 32, SERIF);
  ctx.fillText(verse, 72, 446, W - 144);

  // 五维雷达
  const cx = W / 2, cy = 760, R = 210;
  const keys = METRIC_LABELS;
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1;
  for (let ring = 1; ring <= 4; ring++) {
    ctx.beginPath();
    for (let i = 0; i <= 5; i++) {
      const a = (i % 5) * 72 - 90;
      const [x, y] = [cx + (R * ring / 4) * Math.cos(a * Math.PI / 180), cy + (R * ring / 4) * Math.sin(a * Math.PI / 180)];
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const a = (i * 72 - 90) * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
    ctx.stroke();
  }
  // 数据多边形
  const pts = keys.map((k, i) => {
    const v = chart.metrics[k.key] / 100;
    const a = (i * 72 - 90) * Math.PI / 180;
    return [cx + R * v * Math.cos(a), cy + R * v * Math.sin(a)] as [number, number];
  });
  const fillGrad = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  fillGrad.addColorStop(0, 'rgba(168,50,40,0.18)');
  fillGrad.addColorStop(1, 'rgba(110,61,165,0.18)');
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = fillGrad;
  ctx.fill();
  ctx.strokeStyle = '#a83228';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // 标签 + 数值
  keys.forEach((k, i) => {
    const a = (i * 72 - 90) * Math.PI / 180;
    const lx = cx + (R + 56) * Math.cos(a);
    const ly = cy + (R + 56) * Math.sin(a);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1a1a18';
    ctx.font = `600 30px ${SANS}`;
    ctx.fillText(k.label, lx, ly);
    ctx.fillStyle = '#a83228';
    ctx.font = `700 26px ${SANS}`;
    ctx.fillText(String(chart.metrics[k.key]), lx, ly + 36);
    ctx.fillStyle = '#6e3da5';
    ctx.beginPath(); ctx.arc(pts[i][0], pts[i][1], 6, 0, Math.PI * 2); ctx.fill();
  });
  ctx.textAlign = 'left';

  // 摘要为右下印章留出独立列；人格说明最多两行，超长文本按实测宽度省略。
  const sealS = 92, sealX = W - 72 - sealS, sealY = H - 96 - sealS - 22;
  const valueWidth = sealX - 24 - 200;
  let y = 1080;
  ctx.font = `400 26px ${SANS}`;
  for (const [k, v] of summaryRows(chart, hideBirth)) {
    const lines = hideBirth && k === '人格'
      ? wrapText(ctx, v, valueWidth, 2)
      : [ellipsize(ctx, v, valueWidth)];
    ctx.fillStyle = '#6e6e66';
    ctx.fillText(k, 72, y);
    ctx.fillStyle = '#1a1a18';
    for (const text of lines) {
      ctx.fillText(text, 200, y, valueWidth);
      y += 46;
    }
  }

  // 朱砂印章（右下，白文「紫微斗数」2×2）
  ctx.fillStyle = '#a83228';
  ctx.beginPath();
  ctx.moveTo(sealX + 10, sealY);
  ctx.arcTo(sealX + sealS, sealY, sealX + sealS, sealY + sealS, 10);
  ctx.arcTo(sealX + sealS, sealY + sealS, sealX, sealY + sealS, 10);
  ctx.arcTo(sealX, sealY + sealS, sealX, sealY, 10);
  ctx.arcTo(sealX, sealY, sealX + sealS, sealY, 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 34px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.fillText('紫微', sealX + sealS / 2, sealY + 38);
  ctx.fillText('斗数', sealX + sealS / 2, sealY + 74);
  ctx.textAlign = 'left';

  // 页脚
  ctx.strokeStyle = 'rgba(139,90,43,0.3)';
  ctx.beginPath(); ctx.moveTo(72, H - 96); ctx.lineTo(W - 72, H - 96); ctx.stroke();
  ctx.fillStyle = '#6e6e66';
  ctx.font = `400 20px ${SANS}`;
  ctx.fillText('紫微斗数 · 2026 Qoder 高校创造力大赛 LifeHack 赛道', 72, H - 58, W - 144);
  ctx.textAlign = 'right';
  ctx.fillText('娱乐参考 · 命由星写，路由己走', W - 72, H - 28, W - 144);
  ctx.textAlign = 'left';
}

export function mountShare(): { el: HTMLElement; update: (st: AppState) => void } {
  const canvas = h('canvas', { class: 'share-canvas', width: W, height: H, 'aria-label': '人格化星卡预览' }) as HTMLCanvasElement;
  const nickIn = h('input', { type: 'text', class: 'field', maxlength: 16, placeholder: '星卡署名', 'aria-label': '星卡署名' }) as HTMLInputElement;
  const hideBirthIn = h('input', {
    type: 'checkbox', checked: true, 'aria-label': '隐藏生辰信息', 'aria-describedby': 'share-privacy-help',
  }) as HTMLInputElement;
  const privacyToggle = h('label', { class: 'tgl' },
    hideBirthIn,
    h('span', { class: 'tgl-track', 'aria-hidden': 'true' }, h('span', { class: 'tgl-thumb' })),
    h('span', { class: 'tgl-text' },
      h('strong', { text: '隐藏生辰信息' }),
      h('small', { id: 'share-privacy-help', text: '默认隐藏日期、时刻、农历、干支、性别与城市，署名仍保留。取消勾选后，星卡和复制判词会包含生辰信息。' }),
    ),
  );
  const downloadBtn = h('button', { type: 'button', class: 'btn btn-primary' }, '下载星卡 PNG') as HTMLButtonElement;
  const copyBtn = h('button', { type: 'button', class: 'btn btn-ghost' }, '复制判词') as HTMLButtonElement;
  const status = h('p', { class: 'share-status', role: 'status' });
  const emptyBox = h('div', { class: 'share-empty' },
    h('p', { text: '起盘之后，即可生成专属于你的人格星卡。' }),
    h('a', { class: 'btn btn-ghost btn-sm', href: '#cast', text: '去起盘' }),
  );

  const el = h('section', { class: 'section share', id: 'share' },
    h('div', { class: 'section-head' },
      h('span', { class: 'section-no', text: '04' }),
      h('h2', { class: 'section-title', text: '星卡 · 把命盘带走' }),
      h('p', { class: 'section-sub', text: '一张奶金国风的人格星卡：原型、诗句、五维雷达与人格关键词，默认隐藏生辰，可下载可复制。' }),
    ),
    h('div', { class: 'share-grid' },
      h('div', { class: 'share-preview card' }, canvas, emptyBox),
      h('div', { class: 'share-side' },
        h('div', { class: 'card' },
          h('h3', { class: 'card-title', text: '定制与导出' }),
          h('label', { class: 'form-field' }, h('span', { class: 'form-label', text: '署名' }), nickIn),
          privacyToggle,
          h('div', { class: 'share-actions' }, downloadBtn, copyBtn),
          status,
          h('p', { class: 'muted share-note', text: '星卡在本机 Canvas 绘制，不经过任何服务器。五维指标为确定性趣味算法，同一命盘恒得同一结果。' }),
        ),
        h('div', { class: 'card share-metrics' },
          h('h3', { class: 'card-title', text: '人生五维' }),
          h('div', { class: 'metric-bars' }),
        ),
      ),
    ),
  );

  let drawnKey = '';
  let metricsId = '';
  let privacyChartId: string | null = null;
  let exportVersion = 0;

  function invalidateExport(): void {
    exportVersion += 1;
    status.textContent = '';
  }

  function syncPrivacy(chart: Chart | null): void {
    const id = chart?.id ?? null;
    if (id === privacyChartId) return;
    privacyChartId = id;
    hideBirthIn.checked = true;
    drawnKey = '';
    invalidateExport();
  }

  function currentNick(chart = getState().chart): string {
    return nickIn.value.trim() || chart?.input.nickname || '星旅人';
  }

  function cardKey(chart: Chart): string {
    return JSON.stringify([chart.id, currentNick(chart), hideBirthIn.checked]);
  }

  function redraw(chart = getState().chart): void {
    syncPrivacy(chart);
    if (!chart) return;
    const key = cardKey(chart);
    if (key !== drawnKey) invalidateExport();
    drawCard(canvas, chart, currentNick(chart), hideBirthIn.checked);
    drawnKey = key;
  }

  // 切换隐私、署名或命盘后，旧的异步导出不得下载或恢复过期提示。
  function isCurrentExport(version: number, chart: Chart): boolean {
    return version === exportVersion && getState().chart?.id === chart.id;
  }

  function renderMetrics(): void {
    const chart = getState().chart;
    const box = el.querySelector('.metric-bars') as HTMLElement;
    if (!chart) { box.innerHTML = ''; metricsId = ''; return; }
    if (chart.id === metricsId) return;
    metricsId = chart.id;
    box.innerHTML = '';
    const colors = ['#6e3da5', '#c8a03a', '#a83228', '#2d7a4a', '#1a56a8'];
    METRIC_LABELS.forEach((k, i) => {
      const v = chart.metrics[k.key];
      box.appendChild(h('div', { class: 'metric-row' },
        h('span', { class: 'metric-label', text: `${k.icon} ${k.label}` }),
        h('div', { class: 'metric-track' },
          h('div', { class: 'metric-fill', style: { width: `${v}%`, background: colors[i] } }),
        ),
        h('span', { class: 'metric-val', text: String(v) }),
      ));
    });
  }

  nickIn.addEventListener('input', () => {
    const chart = getState().chart;
    if (chart) setState({ input: { ...getState().input, nickname: nickIn.value } });
    redraw();
  });

  hideBirthIn.addEventListener('change', () => {
    invalidateExport();
    redraw();
  });

  downloadBtn.addEventListener('click', () => {
    const chart = getState().chart;
    if (!chart) return;
    redraw(chart);
    const version = ++exportVersion;
    const nickname = currentNick(chart);
    const privacyNote = hideBirthIn.checked ? '已隐藏生辰，署名保留' : '包含生辰信息';
    status.textContent = '正在导出星卡…';
    try {
      canvas.toBlob((blob) => {
        if (!isCurrentExport(version, chart)) return;
        if (!blob) { status.textContent = '当前浏览器不支持导出，请改用截图。'; return; }
        try {
          const url = URL.createObjectURL(blob);
          const a = h('a', { href: url, download: `紫微斗数-${nickname}.png` }) as HTMLAnchorElement;
          document.body.appendChild(a);
          try { a.click(); }
          finally {
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 4000);
          }
          sExport();
          status.textContent = `星卡已导出（${privacyNote}）。`;
        } catch {
          status.textContent = '导出失败，请改用截图保存。';
        }
      }, 'image/png');
    } catch {
      status.textContent = '导出失败，请改用截图保存。';
    }
  });

  copyBtn.addEventListener('click', async () => {
    const chart = getState().chart;
    if (!chart) return;
    redraw(chart);
    sTap();
    const version = ++exportVersion;
    const privacyNote = hideBirthIn.checked ? '已隐藏生辰，署名保留' : '包含生辰信息';
    const success = `判词已复制到剪贴板（${privacyNote}）。`;
    const m = chart.metrics;
    const text = [
      `${currentNick(chart)} 的紫微斗数命盘`,
      `人格原型：${chart.archetype}`,
      `诗曰：${chart.verse}`,
      ...summaryRows(chart, hideBirthIn.checked).map(([label, value]) => `${label}：${value}`),
      `五维：事业${m.career} 财运${m.wealth} 感情${m.love} 健康${m.health} 人缘${m.social}`,
      '—— 紫微斗数（娱乐参考，命由星写，路由己走）',
    ].join('\n');
    status.textContent = '正在复制判词…';
    try {
      await navigator.clipboard.writeText(text);
      if (isCurrentExport(version, chart)) status.textContent = success;
    } catch {
      // 异步剪贴板失败时，不能把切换前的生辰文本再写入 fallback。
      if (!isCurrentExport(version, chart)) return;
      const ta = h('textarea', { readonly: true, style: { position: 'fixed', opacity: '0' } }, text) as HTMLTextAreaElement;
      const previousFocus = document.activeElement;
      document.body.appendChild(ta);
      let copied = false;
      try {
        ta.focus({ preventScroll: true });
        ta.select();
        copied = document.execCommand('copy');
      } catch {
        copied = false;
      } finally {
        ta.remove();
        if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
      }
      status.textContent = copied ? success : '复制失败，请重试或下载星卡。';
    }
  });

  function update(st: AppState): void {
    const chart = st.chart;
    const chartChanged = (chart?.id ?? null) !== privacyChartId;
    syncPrivacy(chart);
    const has = !!chart;
    canvas.style.display = has ? '' : 'none';
    emptyBox.style.display = has ? 'none' : '';
    downloadBtn.disabled = !has;
    copyBtn.disabled = !has;
    hideBirthIn.disabled = !has;
    if (!chart) { drawnKey = ''; renderMetrics(); return; }
    if (chartChanged || document.activeElement !== nickIn) nickIn.value = st.input.nickname ?? '';
    if (cardKey(chart) !== drawnKey) redraw(chart);
    renderMetrics();
  }
  update(getState());
  return { el, update };
}