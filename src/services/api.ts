/**
 * 统一数据访问层（前后端契约的唯一调用入口）。
 * ------------------------------------------------------------------
 * 设计原则：可插拔。
 *  - 默认全部由前端本地计算/本地存储实现（local），核心体验不依赖任何后端。
 *  - 配置 VITE_API_BASE 后，优先调用远端 /api/v1/*；远端不可用时自动回落 local。
 *  - UI 只依赖本层返回的 ApiResult，不关心数据来源，替换 mock 无需改 UI。
 * 接口契约详见 docs/api.md。
 */
import type {
  ApiResult, BirthInput, Chart, ChartSummary, Interpretation,
} from '../engine/types';
import { computeChart as localCompute } from '../engine/ziwei';
import { palaceReading, starReading, archetypeOf } from '../engine/interpret';
import { PALACES } from '../content/palaces';

const API_BASE: string = (import.meta as any).env?.VITE_API_BASE ?? '';
const USE_REMOTE = API_BASE.length > 0;
const HISTORY_KEY = 'ziwei.orbit.history.v1';
const HISTORY_LIMIT = 24;

interface HistoryRecord {
  summary: ChartSummary;
  chart: Chart;
}

function readHistory(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryRecord[]) : [];
  } catch {
    return [];
  }
}
function writeHistory(records: HistoryRecord[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, HISTORY_LIMIT)));
  } catch {
    /* 存储满或隐私模式：静默降级，不影响核心体验 */
  }
}

function toSummary(chart: Chart): ChartSummary {
  return {
    id: chart.id,
    solarDate: chart.solarDate,
    lunarDate: chart.lunarDate,
    genderLabel: chart.genderLabel,
    soulBranch: chart.soulBranch,
    archetype: chart.archetype,
    nickname: chart.input.nickname,
    createdAt: chart.createdAt,
  };
}

async function remote<T>(path: string, init?: RequestInit): Promise<ApiResult<T> | null> {
  if (!USE_REMOTE) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as ApiResult<T>;
  } catch {
    return null; // 触发本地回落
  }
}

/** 排盘 */
export async function compute(input: BirthInput): Promise<ApiResult<Chart>> {
  const r = await remote<Chart>('/api/v1/charts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (r?.ok && r.data) return { ...r, source: 'remote' };
  return localCompute(input);
}

/** 按 ID 取盘（先查本地缓存） */
export async function getChart(id: string): Promise<ApiResult<Chart>> {
  const local = readHistory().find((h) => h.summary.id === id);
  if (local) return { ok: true, source: 'local', data: local.chart };
  const r = await remote<Chart>(`/api/v1/charts/${encodeURIComponent(id)}`);
  if (r?.ok && r.data) return { ...r, source: 'remote' };
  return { ok: false, source: 'local', error: { code: 'NOT_FOUND', message: '未找到该命盘' } };
}

/** 历史列表 */
export async function listHistory(): Promise<ApiResult<ChartSummary[]>> {
  const r = await remote<ChartSummary[]>('/api/v1/charts');
  if (r?.ok && r.data) return { ...r, source: 'remote' };
  return { ok: true, source: 'local', data: readHistory().map((h) => h.summary) };
}

/** 保存命盘到历史 */
export async function saveChart(chart: Chart): Promise<ApiResult<{ id: string }>> {
  const records = readHistory().filter((h) => h.summary.id !== chart.id);
  records.unshift({ summary: toSummary(chart), chart });
  writeHistory(records);
  const r = await remote<{ id: string }>('/api/v1/charts', {
    method: 'POST',
    body: JSON.stringify(chart.input),
  });
  return { ok: true, source: r?.ok ? 'remote' : 'local', data: { id: chart.id } };
}

/** 删除历史 */
export async function removeChart(id: string): Promise<ApiResult<{ id: string }>> {
  writeHistory(readHistory().filter((h) => h.summary.id !== id));
  await remote(`/api/v1/charts/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return { ok: true, source: 'local', data: { id } };
}

/** 解读（当前本地原创；远端 AI 预留） */
export async function interpret(chart: Chart, palaceName?: string): Promise<ApiResult<Interpretation>> {
  const r = await remote<Interpretation>(`/api/v1/charts/${encodeURIComponent(chart.id)}/interpretation`, {
    method: 'POST',
    body: JSON.stringify({ palace: palaceName }),
  });
  if (r?.ok && r.data) return { ...r, source: 'remote' };

  let text: string;
  if (palaceName) {
    const p = chart.palaces.find((x) => x.name === palaceName);
    text = p ? palaceReading(chart, p).join('\n\n') : '未找到该宫位。';
  } else {
    const patterns = chart.patterns.length
      ? chart.patterns.map((p) => `「${p.name}」${p.summary}`).join('\n')
      : '此盘未入经典格局，星曜组合自有独特轨迹，不必拘泥古格。';
    text = `${archetypeOf(chart)}。\n\n${patterns}`;
  }
  return { ok: true, source: 'local', data: { chartId: chart.id, palace: palaceName, text, source: 'local' } };
}

/** 单星解读（本地） */
export function interpretStar(chart: Chart, starName: string): string {
  for (const p of chart.palaces) {
    const s = [...p.majorStars, ...p.minorStars, ...p.adjectiveStars].find((x) => x.name === starName);
    if (s) return starReading(s).body.join('\n\n');
  }
  return '未找到该星曜。';
}

export const API_INFO = { base: API_BASE, useRemote: USE_REMOTE, prefix: '/api/v1' };
export { PALACES };